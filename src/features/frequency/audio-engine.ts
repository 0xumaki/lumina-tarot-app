"use client";

import * as React from "react";
import * as Tone from "tone";

/**
 * Lumina Frequency Engine v8 — Zero glitches.
 *
 * COMPLETELY SIMPLIFIED from v7:
 * - NO MediaElementSource (was causing routing issues + clicks)
 * - NO per-oscillator gain nodes (was causing zipper noise)
 * - NO Tone.Merge for binaural (was causing stereo routing issues)
 * - Ambient bed: plain HTML <audio> element (no Web Audio routing)
 * - Frequency tone: ONE master gain, oscillators connected directly
 * - Fade: simple HTML audio volume ramp + Tone master gain ramp
 * - Stop: immediate master gain to 0, then dispose after 100ms
 *
 * The tap-tap-tap was caused by:
 * 1. Multiple gain nodes with different ramp times creating amplitude beating
 * 2. MediaElementSource creating a secondary audio graph that could glitch
 * 3. Tone.Merge creating stereo phase issues
 * 4. WAV loop boundary clicks (fixed by applying fade-in/fade-out to WAV files)
 */

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

const BED_AUDIO_FILES: Record<string, string> = {
  rain: "/audio/rain.wav",
  ocean: "/audio/ocean.wav",
  wind: "/audio/wind.wav",
  stream: "/audio/stream.wav",
  river: "/audio/river.wav",
  none: "",
};

export function useFrequencyEngine() {
  const sessionRef = React.useRef<{
    oscillators: Tone.Oscillator[];
    masterGain: Tone.Gain;
    bedAudio: HTMLAudioElement | null;
    timer: ReturnType<typeof setInterval> | null;
    startTime: number;
    isStopping: boolean;
    fadeInterval: ReturnType<typeof setInterval> | null;
  } | null>(null);

  const stopRef = React.useRef<() => number>(() => 0);

  /**
   * GRACEFUL STOP — 2s fade, then dispose.
   * Simple, reliable, no complex routing.
   */
  const stop = React.useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.isStopping) return 0;

    session.isStopping = true;

    // Clear timer
    if (session.timer) {
      clearInterval(session.timer);
      session.timer = null;
    }
    // Clear any existing fade interval
    if (session.fadeInterval) {
      clearInterval(session.fadeInterval);
      session.fadeInterval = null;
    }

    const fadeOut = 2.0; // 2 seconds
    const steps = 40; // 50ms per step
    const stepDuration = (fadeOut * 1000) / steps;

    // Get current master gain value
    let currentMasterVal = 0.4;
    try { currentMasterVal = session.masterGain.gain.value; } catch {}

    // Get current bed audio volume
    let currentBedVol = 0.5;
    try { currentBedVol = session.bedAudio?.volume ?? 0; } catch {}

    // Fade both master gain and bed audio using simple JS interval
    let step = 0;
    session.fadeInterval = setInterval(() => {
      step++;
      const factor = Math.max(0, 1 - step / steps);

      // Fade master gain (Tone.js oscillators)
      try {
        session.masterGain.gain.value = currentMasterVal * factor;
      } catch {}

      // Fade bed audio volume
      try {
        if (session.bedAudio) {
          session.bedAudio.volume = currentBedVol * factor;
        }
      } catch {}

      // When fade complete
      if (step >= steps) {
        clearInterval(session.fadeInterval!);
        session.fadeInterval = null;

        // Stop oscillators
        session.oscillators.forEach((o) => {
          try { o.stop(); } catch {}
        });

        // Pause bed audio
        try { session.bedAudio?.pause(); } catch {}

        // Dispose everything
        session.oscillators.forEach((o) => {
          try { o.dispose(); } catch {}
        });
        try { session.masterGain.dispose(); } catch {}

        sessionRef.current = null;
      }
    }, stepDuration);

    const played = session.startTime ? (Date.now() - session.startTime) / 1000 : 0;
    return played;
  }, []);

  React.useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const start = React.useCallback(
    async (opts: StartOptions) => {
      // CRITICAL: Resume audio context FIRST (within user gesture)
      try {
        const ctx = Tone.getContext();
        if (ctx.state !== "running") {
          await ctx.resume();
        }
        await Tone.start();
      } catch {}

      // HARD STOP any existing session
      const existing = sessionRef.current;
      if (existing) {
        if (existing.timer) clearInterval(existing.timer);
        if (existing.fadeInterval) clearInterval(existing.fadeInterval);
        existing.oscillators.forEach((o) => { try { o.stop(); o.dispose(); } catch {} });
        try { existing.masterGain.dispose(); } catch {}
        try { existing.bedAudio?.pause(); } catch {}
        sessionRef.current = null;
      }

      const fadeIn = 2.0;
      const now = Tone.now();

      // === SINGLE MASTER GAIN — everything goes through this ===
      const masterGain = new Tone.Gain(0).toDestination();

      const oscillators: Tone.Oscillator[] = [];

      // === FREQUENCY TONE ===
      // Simplified: all oscillators connect DIRECTLY to masterGain (no intermediate gains)
      if (opts.mode === "pure") {
        const osc = new Tone.Oscillator(opts.carrierHz, "sine");
        osc.connect(masterGain);
        osc.start(now);
        oscillators.push(osc);

      } else if (opts.mode === "binaural") {
        // Binaural: two oscillators at slightly different frequencies
        // Both go to masterGain (mono mix — simpler, no stereo routing issues)
        const beat = opts.binauralBeatHz || 7;
        const leftFreq = opts.carrierHz - beat / 2;
        const rightFreq = opts.carrierHz + beat / 2;

        const left = new Tone.Oscillator(leftFreq, "sine");
        left.connect(masterGain);
        left.start(now);
        oscillators.push(left);

        const right = new Tone.Oscillator(rightFreq, "sine");
        right.connect(masterGain);
        right.start(now);
        oscillators.push(right);

      } else {
        // pad mode — 3 oscillators, all connect directly to masterGain
        const freqs = [opts.carrierHz, opts.carrierHz * 1.5, opts.carrierHz * 2];
        for (const f of freqs) {
          const osc = new Tone.Oscillator(f, "sine");
          osc.connect(masterGain);
          osc.start(now);
          oscillators.push(osc);
        }
      }

      // === AMBIENT BED — plain HTML audio element (NO MediaElementSource) ===
      let bedAudio: HTMLAudioElement | null = null;
      const bedFile = BED_AUDIO_FILES[opts.ambient] || "";

      if (bedFile) {
        bedAudio = new Audio(bedFile);
        bedAudio.loop = true;
        bedAudio.volume = 0; // Start silent, fade in
        bedAudio.crossOrigin = "anonymous";

        try {
          await bedAudio.play();
          // Fade in over 2 seconds (20 steps × 100ms)
          const targetVol = 0.5;
          let fadeStep = 0;
          const fadeSteps = 20;
          const bedFadeInterval = setInterval(() => {
            fadeStep++;
            try {
              bedAudio!.volume = Math.min(targetVol, (targetVol / fadeSteps) * fadeStep);
            } catch {}
            if (fadeStep >= fadeSteps) clearInterval(bedFadeInterval);
          }, 100);
        } catch (e) {
          console.warn("Bed audio failed:", e);
          bedAudio = null;
        }
      }

      // Fade in master gain (frequency tone)
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(0.15, now + fadeIn); // Lower volume (0.15, was 0.4)

      // Store session
      sessionRef.current = {
        oscillators,
        masterGain,
        bedAudio,
        timer: null,
        startTime: Date.now(),
        isStopping: false,
        fadeInterval: null,
      };

      // Timer
      let remaining = opts.durationSec;
      opts.onTick?.(remaining);

      sessionRef.current.timer = setInterval(() => {
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
      const session = sessionRef.current;
      if (session) {
        if (session.timer) clearInterval(session.timer);
        if (session.fadeInterval) clearInterval(session.fadeInterval);
        session.oscillators.forEach((o) => { try { o.stop(); o.dispose(); } catch {} });
        try { session.masterGain.dispose(); } catch {}
        try { session.bedAudio?.pause(); } catch {}
        sessionRef.current = null;
      }
    };
  }, []);

  return { start, stop };
}

export type { AmbientBed };
