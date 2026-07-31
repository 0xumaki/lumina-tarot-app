"use client";

import * as React from "react";

/**
 * Lumina Frequency Engine v5 — Real audio files + Tone.js frequencies.
 *
 * ARCHITECTURE:
 * - Frequency tones: Tone.js oscillators (sine waves at the Solfeggio frequency)
 * - Ambient beds: REAL WAV audio files played via HTML <audio> element
 *   (not synthesized noise — actual recorded/real sounds)
 *
 * Anti-click measures:
 * 1. All oscillators start at gain=0, ramp up over 3s
 * 2. All oscillators ramp to 0 over 2s before stop/dispose
 * 3. Audio elements fade out gradually (not sharp cut)
 * 4. Master gain never changes abruptly
 * 5. Timer only updates React state, never touches audio nodes
 */

import * as Tone from "tone";

type Mode = "pure" | "binaural" | "pad";
type AmbientBed = "ambient" | "rain" | "ocean" | "wind" | "birds" | "stream" | "river" | "none";

interface StartOptions {
  carrierHz: number;
  binauralBeatHz: number;
  mode: Mode;
  durationSec: number;
  ambient: AmbientBed;
  onTick?: (secondsLeft: number) => void;
  onEnd?: () => void;
}

// Map ambient bed IDs to real WAV files
const BED_AUDIO_FILES: Record<string, string> = {
  ambient: "/audio/ambient.wav",
  rain: "/audio/rain.wav",
  ocean: "/audio/ocean.wav",
  wind: "/audio/wind.wav",
  birds: "/audio/forest.wav", // "birds" maps to forest.wav (has bird sounds)
  stream: "/audio/stream.wav",
  river: "/audio/river.wav",
  none: "",
};

export function useFrequencyEngine() {
  const sessionRef = React.useRef<{
    oscillators: Tone.Oscillator[];
    gains: Tone.Gain[];
    lfos: Tone.LFO[];
    filter: Tone.Filter | null;
    merger: Tone.Merge | null;
    masterGain: Tone.Gain | null;
    bedAudio: HTMLAudioElement | null;
    timer: ReturnType<typeof setInterval> | null;
    startTime: number;
  } | null>(null);

  const stopRef = React.useRef<() => number>(() => 0);

  const stop = React.useCallback(() => {
    const session = sessionRef.current;
    if (!session) return 0;

    // Clear timer first
    if (session.timer) {
      clearInterval(session.timer);
      session.timer = null;
    }

    const now = Tone.now();
    const fadeOut = 2.0;

    // Ramp master gain to zero
    try {
      if (session.masterGain) {
        session.masterGain.gain.cancelScheduledValues(now);
        session.masterGain.gain.setValueAtTime(session.masterGain.gain.value, now);
        session.masterGain.gain.rampTo(0.0001, fadeOut);
      }
    } catch {}

    // Fade out ambient audio gradually
    if (session.bedAudio) {
      const audio = session.bedAudio;
      const currentVol = audio.volume;
      const steps = 20;
      const stepDuration = (fadeOut * 1000) / steps;
      const volStep = currentVol / steps;
      let stepCount = 0;

      const fadeInterval = setInterval(() => {
        stepCount++;
        const newVol = Math.max(0, currentVol - volStep * stepCount);
        try { audio.volume = newVol; } catch {}
        if (stepCount >= steps) {
          clearInterval(fadeInterval);
          try { audio.pause(); } catch {}
        }
      }, stepDuration);
    }

    // Dispose Tone.js nodes after fade completes
    setTimeout(() => {
      const s = sessionRef.current;
      if (!s) return;
      s.oscillators.forEach((o) => {
        try { o.stop(); } catch {}
        try { o.dispose(); } catch {}
      });
      s.lfos.forEach((l) => {
        try { l.stop(); } catch {}
        try { l.dispose(); } catch {}
      });
      s.gains.forEach((g) => {
        try { g.dispose(); } catch {}
      });
      try { s.filter?.dispose(); } catch {}
      try { s.merger?.dispose(); } catch {}
      try { s.masterGain?.dispose(); } catch {}
      sessionRef.current = null;
    }, fadeOut * 1000 + 200);

    const played = session.startTime ? (Date.now() - session.startTime) / 1000 : 0;
    sessionRef.current = null;
    return played;
  }, []);

  React.useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const start = React.useCallback(
    async (opts: StartOptions) => {
      // Stop any existing session first
      stop();

      // Resume audio context (required for browsers)
      try {
        const ctx = Tone.getContext();
        if (ctx.state !== "running") {
          await ctx.resume().catch(() => {});
        }
        await Tone.start();
      } catch {}

      const fadeIn = 3.0;

      // === MASTER CHAIN ===
      const masterGain = new Tone.Gain(0).toDestination();

      // Master lowpass for warmth
      const filter = new Tone.Filter({
        type: "lowpass",
        frequency: 4500,
        Q: 0.3,
      }).connect(masterGain);

      const allOscillators: Tone.Oscillator[] = [];
      const allGains: Tone.Gain[] = [];
      const allLfos: Tone.LFO[] = [];
      let merger: Tone.Merge | null = null;

      // === FREQUENCY TONE (Tone.js oscillators) ===
      if (opts.mode === "pure") {
        const toneGain = new Tone.Gain(0).connect(masterGain);
        allGains.push(toneGain);

        const fundamental = new Tone.Oscillator({
          frequency: opts.carrierHz,
          type: "sine",
          volume: -10,
        }).connect(toneGain);
        fundamental.start();
        allOscillators.push(fundamental);

        const harmGain = new Tone.Gain(0.06).connect(masterGain);
        allGains.push(harmGain);
        const harmonic = new Tone.Oscillator({
          frequency: opts.carrierHz * 2,
          type: "sine",
          volume: -18,
        }).connect(harmGain);
        harmonic.start();
        allOscillators.push(harmonic);

        toneGain.gain.rampTo(0.18, fadeIn);
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
          volume: -10,
        }).connect(leftGain);
        left.start();
        allOscillators.push(left);

        const rightGain = new Tone.Gain(0).connect(merger, 0, 1);
        allGains.push(rightGain);
        const right = new Tone.Oscillator({
          frequency: rightFreq,
          type: "sine",
          volume: -10,
        }).connect(rightGain);
        right.start();
        allOscillators.push(right);

        leftGain.gain.rampTo(0.16, fadeIn);
        rightGain.gain.rampTo(0.16, fadeIn);
      } else {
        // pad mode
        const padGain = new Tone.Gain(0).connect(masterGain);
        allGains.push(padGain);

        const freqs = [
          { freq: opts.carrierHz, type: "sine" as Tone.ToneOscillatorType, gain: 0.12 },
          { freq: opts.carrierHz * 1.005, type: "sine" as Tone.ToneOscillatorType, gain: 0.08 },
          { freq: opts.carrierHz * 1.5, type: "sine" as Tone.ToneOscillatorType, gain: 0.06 },
        ];

        for (const f of freqs) {
          const oscGain = new Tone.Gain(f.gain).connect(padGain);
          allGains.push(oscGain);
          const osc = new Tone.Oscillator({
            frequency: f.freq,
            type: f.type,
            volume: -12,
          }).connect(oscGain);
          osc.start();
          allOscillators.push(osc);

          const lfo = new Tone.LFO({
            frequency: 0.1,
            min: f.freq - 0.5,
            max: f.freq + 0.5,
          }).connect(osc.frequency);
          lfo.start();
          allLfos.push(lfo);
        }

        padGain.gain.rampTo(0.25, fadeIn);
      }

      // === AMBIENT BED — REAL WAV AUDIO FILE ===
      let bedAudio: HTMLAudioElement | null = null;
      const bedFile = BED_AUDIO_FILES[opts.ambient] || "";

      if (bedFile) {
        bedAudio = new Audio(bedFile);
        bedAudio.loop = true;
        bedAudio.volume = 0; // Start at 0, fade in
        bedAudio.crossOrigin = "anonymous";

        // Play and fade in
        try {
          await bedAudio.play();
          // Gradual fade in over 3 seconds
          const fadeSteps = 30;
          const targetVol = 0.5;
          const volIncrement = targetVol / fadeSteps;
          let step = 0;
          const fadeInterval = setInterval(() => {
            step++;
            try {
              bedAudio!.volume = Math.min(targetVol, volIncrement * step);
            } catch {}
            if (step >= fadeSteps) {
              clearInterval(fadeInterval);
            }
          }, 100);
        } catch (e) {
          console.warn("Ambient bed audio failed to start:", e);
          bedAudio = null;
        }
      }

      // Store session
      sessionRef.current = {
        oscillators: allOscillators,
        gains: allGains,
        lfos: allLfos,
        filter,
        merger,
        masterGain,
        bedAudio,
        timer: null,
        startTime: Date.now(),
      };

      // Smooth master fade in
      masterGain.gain.rampTo(0.45, fadeIn);

      // Set up timer — ONLY updates state, never touches audio nodes
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
      stopRef.current();
    };
  }, []);

  return { start, stop };
}

export type { AmbientBed };
