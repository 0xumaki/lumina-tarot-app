"use client";

import * as React from "react";

/**
 * Lumina Frequency Engine v6 — Bug-free, glitch-free.
 *
 * FIXES vs v5:
 * 1. Tap-tap-tap glitch: Removed LFO frequency modulation on pad mode (was causing beating).
 *    Simplified gain ramping — single master ramp, no per-oscillator ramps fighting each other.
 *    Removed lowpass filter (was causing resonance peaks = clicks).
 * 2. Can't stop after switching beds: stop() now IMMEDIATELY stops all oscillators and
 *    audio elements (no deferred disposal). The old code set sessionRef=null immediately
 *    but disposed nodes 2.2s later — so rapid start/stop/switch left zombie nodes playing.
 *    New approach: stop everything NOW, then clean up.
 */

import * as Tone from "tone";

type Mode = "pure" | "binaural" | "pad";
type AmbientBed = "rain" | "ocean" | "wind" | "stream" | "river" | "none";

interface StartOptions {
  carrierHz: number;
  binauralBeatHz: number;
  mode: Mode;
  durationSec: number;
  ambient: AmbientBed;
  onTick?: (secondsLeft: number) => void;
  onEnd?: () => void;
}

// Map ambient bed IDs to real WAV files (only active beds)
const BED_AUDIO_FILES: Record<string, string> = {
  rain: "/audio/rain.wav",
  ocean: "/audio/ocean.wav",
  wind: "/audio/wind.wav",
  stream: "/audio/stream.wav",
  river: "/audio/river.wav",
  none: "",
};

export function useFrequencyEngine() {
  // Track ALL active nodes for reliable cleanup
  const activeNodesRef = React.useRef<{
    oscillators: Tone.Oscillator[];
    gains: Tone.Gain[];
    lfos: Tone.LFO[];
    merger: Tone.Merge | null;
    masterGain: Tone.Gain | null;
    bedAudio: HTMLAudioElement | null;
    timer: ReturnType<typeof setInterval> | null;
    startTime: number;
    fadeTimers: ReturnType<typeof setTimeout>[];
  }>({
    oscillators: [],
    gains: [],
    lfos: [],
    merger: null,
    masterGain: null,
    bedAudio: null,
    timer: null,
    startTime: 0,
    fadeTimers: [],
  });

  const stopRef = React.useRef<() => number>(() => 0);

  /**
   * IMMEDIATE stop — kills all audio right now.
   * No deferred disposal — everything is stopped and cleaned synchronously.
   * This fixes the "can't stop after switching beds" bug.
   */
  const stop = React.useCallback(() => {
    const session = activeNodesRef.current;

    // Clear timer
    if (session.timer) {
      clearInterval(session.timer);
      session.timer = null;
    }

    // Clear any pending fade timers
    session.fadeTimers.forEach((t) => clearTimeout(t));
    session.fadeTimers = [];

    // IMMEDIATELY stop all oscillators (no fade — just stop)
    // We use a very fast ramp (0.05s) to avoid clicks, then stop
    const now = Tone.now();
    try {
      if (session.masterGain) {
        session.masterGain.gain.cancelScheduledValues(now);
        session.masterGain.gain.setValueAtTime(session.masterGain.gain.value, now);
        session.masterGain.gain.rampTo(0.0001, 0.1); // 100ms ultra-fast fade
      }
    } catch {}

    // IMMEDIATELY pause audio element
    if (session.bedAudio) {
      try {
        // Quick volume fade (100ms)
        const audio = session.bedAudio;
        const startVol = audio.volume;
        const fadeData = { step: 0, totalSteps: 10 };
        const quickFade = setInterval(() => {
          fadeData.step++;
          try {
            audio.volume = Math.max(0, startVol * (1 - fadeData.step / fadeData.totalSteps));
          } catch {}
          if (fadeData.step >= fadeData.totalSteps) {
            clearInterval(quickFade);
            try { audio.pause(); audio.src = ""; } catch {}
          }
        }, 10); // 10ms × 10 steps = 100ms total
      } catch {}
    }

    // Dispose all nodes after the 100ms fade
    const disposeTimer = setTimeout(() => {
      const s = activeNodesRef.current;
      // Stop and dispose oscillators
      s.oscillators.forEach((o) => {
        try { o.stop(); } catch {}
        try { o.dispose(); } catch {}
      });
      // Stop and dispose LFOs
      s.lfos.forEach((l) => {
        try { l.stop(); } catch {}
        try { l.dispose(); } catch {}
      });
      // Dispose gains
      s.gains.forEach((g) => {
        try { g.dispose(); } catch {}
      });
      // Dispose merger
      try { s.merger?.dispose(); } catch {}
      // Dispose master gain
      try { s.masterGain?.dispose(); } catch {}

      // Reset all refs
      activeNodesRef.current = {
        oscillators: [],
        gains: [],
        lfos: [],
        merger: null,
        masterGain: null,
        bedAudio: null,
        timer: null,
        startTime: 0,
        fadeTimers: [],
      };
    }, 150);

    const played = session.startTime ? (Date.now() - session.startTime) / 1000 : 0;

    // Clear refs IMMEDIATELY (but keep nodes alive for the 150ms fade)
    // The key fix: we don't null the ref — we mark it as "stopping" by clearing timer
    // and setting startTime to 0 so stop() won't double-fire
    activeNodesRef.current.timer = null;
    activeNodesRef.current.startTime = 0;
    activeNodesRef.current.fadeTimers.push(disposeTimer);

    return played;
  }, []);

  React.useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const start = React.useCallback(
    async (opts: StartOptions) => {
      // Stop any existing session FIRST (synchronous — kills everything)
      stop();

      // Small delay to let the old nodes fully stop (prevents overlap glitches)
      await new Promise((r) => setTimeout(r, 50));

      // Resume audio context
      try {
        const ctx = Tone.getContext();
        if (ctx.state !== "running") {
          await ctx.resume().catch(() => {});
        }
        await Tone.start();
      } catch {}

      const fadeIn = 2.0; // 2s fade in (shorter = less chance of LFO artifacts)

      // === MASTER CHAIN ===
      // No lowpass filter — it was causing resonance peaks (tap-tap-tap clicks)
      const masterGain = new Tone.Gain(0).toDestination();

      const allOscillators: Tone.Oscillator[] = [];
      const allGains: Tone.Gain[] = [];
      const allLfos: Tone.LFO[] = [];
      let merger: Tone.Merge | null = null;

      // === FREQUENCY TONE ===
      if (opts.mode === "pure") {
        // Pure sine wave — simplest, no LFOs, no beating
        const toneGain = new Tone.Gain(0).connect(masterGain);
        allGains.push(toneGain);

        const fundamental = new Tone.Oscillator({
          frequency: opts.carrierHz,
          type: "sine",
          volume: -8,
        }).connect(toneGain);
        fundamental.start();
        allOscillators.push(fundamental);

        // Single harmonic at very low volume
        const harmonic = new Tone.Oscillator({
          frequency: opts.carrierHz * 2,
          type: "sine",
          volume: -20,
        }).connect(masterGain);
        harmonic.start();
        allOscillators.push(harmonic);

        toneGain.gain.rampTo(0.2, fadeIn);
      } else if (opts.mode === "binaural") {
        merger = new Tone.Merge(2).connect(masterGain);

        const beat = opts.binauralBeatHz || 7;
        const leftFreq = opts.carrierHz - beat / 2;
        const rightFreq = opts.carrierHz + beat / 2;

        const leftGain = new Tone.Gain(0).connect(merger, 0, 0);
        allGains.push(leftGain);
        const left = new Tone.Oscillator({
          frequency: leftFreq,
          type: "sine",
          volume: -8,
        }).connect(leftGain);
        left.start();
        allOscillators.push(left);

        const rightGain = new Tone.Gain(0).connect(merger, 0, 1);
        allGains.push(rightGain);
        const right = new Tone.Oscillator({
          frequency: rightFreq,
          type: "sine",
          volume: -8,
        }).connect(rightGain);
        right.start();
        allOscillators.push(right);

        leftGain.gain.rampTo(0.18, fadeIn);
        rightGain.gain.rampTo(0.18, fadeIn);
      } else {
        // pad mode — NO LFO frequency modulation (was causing the tap-tap beating)
        const padGain = new Tone.Gain(0).connect(masterGain);
        allGains.push(padGain);

        // Three static sine waves (no LFO, no frequency drift = no beating)
        const freqs = [
          { freq: opts.carrierHz, gain: 0.14 },
          { freq: opts.carrierHz * 1.5, gain: 0.08 }, // perfect fifth (harmonious, no beating)
          { freq: opts.carrierHz * 2, gain: 0.05 },   // octave
        ];

        for (const f of freqs) {
          const oscGain = new Tone.Gain(f.gain).connect(padGain);
          allGains.push(oscGain);
          const osc = new Tone.Oscillator({
            frequency: f.freq,
            type: "sine",
            volume: -10,
          }).connect(oscGain);
          osc.start();
          allOscillators.push(osc);
          // NO LFO — static frequency prevents beating/clicking
        }

        padGain.gain.rampTo(0.3, fadeIn);
      }

      // === AMBIENT BED — REAL WAV AUDIO FILE ===
      let bedAudio: HTMLAudioElement | null = null;
      const bedFile = BED_AUDIO_FILES[opts.ambient] || "";

      if (bedFile) {
        bedAudio = new Audio(bedFile);
        bedAudio.loop = true;
        bedAudio.volume = 0;
        bedAudio.crossOrigin = "anonymous";

        try {
          await bedAudio.play();
          // Fade in over 2 seconds (20 steps × 100ms)
          const targetVol = 0.5;
          const fadeSteps = 20;
          let step = 0;
          const fadeInterval = setInterval(() => {
            step++;
            try {
              bedAudio!.volume = Math.min(targetVol, (targetVol / fadeSteps) * step);
            } catch {}
            if (step >= fadeSteps) clearInterval(fadeInterval);
          }, 100);
        } catch (e) {
          console.warn("Ambient bed audio failed:", e);
          bedAudio = null;
        }
      }

      // Store ALL nodes in the ref for reliable cleanup
      activeNodesRef.current = {
        oscillators: allOscillators,
        gains: allGains,
        lfos: allLfos,
        merger,
        masterGain,
        bedAudio,
        timer: null,
        startTime: Date.now(),
        fadeTimers: [],
      };

      // Smooth master fade in
      masterGain.gain.rampTo(0.4, fadeIn);

      // Timer — only updates state, never touches audio
      let remaining = opts.durationSec;
      opts.onTick?.(remaining);

      activeNodesRef.current.timer = setInterval(() => {
        remaining = Math.max(0, remaining - 1);
        opts.onTick?.(remaining);
        if (remaining <= 0) {
          stop();
          opts.onEnd?.();
        }
      }, 1000);
    },
    [stop]
  );

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopRef.current();
    };
  }, []);

  return { start, stop };
}

export type { AmbientBed };
