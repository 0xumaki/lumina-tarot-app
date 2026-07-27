"use client";

import * as React from "react";
import * as Tone from "tone";

/**
 * Lumina Frequency Engine v3 — powered by Tone.js.
 *
 * Improvements over v2:
 * - Smooth oscillator start/stop with proper envelope ramping (no clicks/glitches)
 * - Lower master gain for comfortable listening (was piercing)
 * - Added ambient bed layer (soft filtered noise + sub-drone) under all tones
 *   for a relaxing, YouTube-live-stream quality sound
 * - Proper gain staging: each layer has its own gain node
 */

type Mode = "pure" | "binaural" | "pad";

interface StartOptions {
  carrierHz: number;
  binauralBeatHz: number;
  mode: Mode;
  durationSec: number;
  onTick?: (secondsLeft: number) => void;
  onEnd?: () => void;
}

export function useFrequencyEngine() {
  const nodesRef = React.useRef<{
    oscillators: Tone.Oscillator[];
    gains: Tone.Gain[];
    lfos: Tone.LFO[];
    noise?: Tone.Noise | null;
    filter: Tone.Filter | null;
    merger: Tone.Merge | null;
    masterGain: Tone.Gain | null;
  } | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = React.useRef(0);
  const stopRef = React.useRef<() => number>(() => 0);

  const stop = React.useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const nodes = nodesRef.current;
    if (nodes) {
      try {
        // Smooth fade out — ramp master gain to silence over 1.5s
        if (nodes.masterGain) {
          nodes.masterGain.gain.cancelScheduledValues(Tone.now());
          nodes.masterGain.gain.setValueAtTime(nodes.masterGain.gain.value, Tone.now());
          nodes.masterGain.gain.rampTo(0.0001, 1.2);
        }
        // Dispose everything after the fade
        setTimeout(() => {
          nodes.oscillators.forEach((o) => {
            try { o.stop(); } catch {}
            try { o.dispose(); } catch {}
          });
          nodes.lfos.forEach((l) => {
            try { l.stop(); } catch {}
            try { l.dispose(); } catch {}
          });
          nodes.gains.forEach((g) => {
            try { g.dispose(); } catch {}
          });
          try { nodes.noise?.stop(); } catch {}
          try { nodes.noise?.dispose(); } catch {}
          try { nodes.filter?.dispose(); } catch {}
          try { nodes.merger?.dispose(); } catch {}
          try { nodes.masterGain?.dispose(); } catch {}
        }, 1300);
      } catch {}
      nodesRef.current = null;
    }

    const played = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0;
    startTimeRef.current = 0;
    return played;
  }, []);

  React.useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const start = React.useCallback(
    async (opts: StartOptions) => {
      // Stop any existing session first
      stop();

      // Resume audio context (non-blocking — don't use Tone.start() as it can hang)
      try {
        const ctx = Tone.getContext();
        if (ctx.state !== "running") {
          ctx.resume().catch(() => {});
        }
      } catch {}

      const fadeIn = 2.0; // 2-second smooth fade in
      const fadeOut = 1.2; // 1.2-second smooth fade out (used in stop())

      // === MASTER CHAIN ===
      // masterGain → filter → destination
      const masterGain = new Tone.Gain(0).toDestination();

      // Lowpass filter on the master for warmth
      const filter = new Tone.Filter({
        type: "lowpass",
        frequency: 4000,
        Q: 0.3,
      }).connect(masterGain);

      const oscillators: Tone.Oscillator[] = [];
      const gains: Tone.Gain[] = [];
      const lfos: Tone.LFO[] = [];

      // === AMBIENT BED (always on, under all modes) ===
      // Soft pink noise + sub-drone for a relaxing foundation
      const noise = new Tone.Noise("pink").start();
      const noiseGain = new Tone.Gain(0.04).connect(filter);
      gains.push(noiseGain);
      const noiseFilter = new Tone.Filter({
        type: "lowpass",
        frequency: 600,
        Q: 0.5,
      }).connect(noiseGain);
      noise.connect(noiseFilter);
      gains.push(noiseGain);

      // Sub-drone: a low sine one octave below the carrier, very quiet
      const subDroneGain = new Tone.Gain(0.06).connect(filter);
      gains.push(subDroneGain);
      const subDrone = new Tone.Oscillator({
        frequency: opts.carrierHz * 0.5,
        type: "sine",
        volume: -14,
      }).connect(subDroneGain);
      subDrone.start();
      oscillators.push(subDrone);

      // Slow LFO on the sub-drone for gentle movement
      const subLfo = new Tone.LFO({
        frequency: 0.08,
        min: 0.03,
        max: 0.09,
      }).connect(subDroneGain.gain);
      subLfo.start();
      lfos.push(subLfo);

      // === FREQUENCY TONE ===
      if (opts.mode === "pure") {
        // Pure tone: fundamental + subtle harmonic
        const toneGain = new Tone.Gain(0).connect(filter);
        gains.push(toneGain);

        const fundamental = new Tone.Oscillator({
          frequency: opts.carrierHz,
          type: "sine",
          volume: -8,
        }).connect(toneGain);
        fundamental.start();
        oscillators.push(fundamental);

        const harmGain = new Tone.Gain(0.08).connect(filter);
        gains.push(harmGain);
        const harmonic = new Tone.Oscillator({
          frequency: opts.carrierHz * 2,
          type: "sine",
          volume: -16,
        }).connect(harmGain);
        harmonic.start();
        oscillators.push(harmonic);

        // Fade in the tone
        toneGain.gain.rampTo(0.25, fadeIn);
      } else if (opts.mode === "binaural") {
        // Binaural beats with stereo separation
        const merger = new Tone.Merge(2).connect(filter);

        const beat = opts.binauralBeatHz || 7;
        const leftFreq = opts.carrierHz - beat / 2;
        const rightFreq = opts.carrierHz + beat / 2;

        // Left channel
        const leftGain = new Tone.Gain(0).connect(merger, 0, 0);
        gains.push(leftGain);
        const left = new Tone.Oscillator({
          frequency: leftFreq,
          type: "sine",
          volume: -8,
        }).connect(leftGain);
        left.start();
        oscillators.push(left);

        // Right channel
        const rightGain = new Tone.Gain(0).connect(merger, 0, 1);
        gains.push(rightGain);
        const right = new Tone.Oscillator({
          frequency: rightFreq,
          type: "sine",
          volume: -8,
        }).connect(rightGain);
        right.start();
        oscillators.push(right);

        // Fade in
        leftGain.gain.rampTo(0.22, fadeIn);
        rightGain.gain.rampTo(0.22, fadeIn);
      } else {
        // Pad — rich layered drone
        const padGain = new Tone.Gain(0).connect(filter);
        gains.push(padGain);

        const freqs = [
          { freq: opts.carrierHz, type: "sine" as Tone.ToneOscillatorType, gain: 0.15 },
          { freq: opts.carrierHz * 1.005, type: "sine" as Tone.ToneOscillatorType, gain: 0.10 },
          { freq: opts.carrierHz * 1.5, type: "sine" as Tone.ToneOscillatorType, gain: 0.08 },
          { freq: opts.carrierHz * 0.25, type: "triangle" as Tone.ToneOscillatorType, gain: 0.05 },
        ];

        for (const f of freqs) {
          const oscGain = new Tone.Gain(f.gain).connect(padGain);
          gains.push(oscGain);

          const osc = new Tone.Oscillator({
            frequency: f.freq,
            type: f.type,
            volume: -10,
          }).connect(oscGain);
          osc.start();
          oscillators.push(osc);

          // Gentle vibrato
          const lfo = new Tone.LFO({
            frequency: 0.1,
            min: f.freq - 0.8,
            max: f.freq + 0.8,
          }).connect(osc.frequency);
          lfo.start();
          lfos.push(lfo);
        }

        // Fade in
        padGain.gain.rampTo(0.35, fadeIn);
      }

      // Store all nodes
      nodesRef.current = { oscillators, gains, lfos, noise, filter, merger: null, masterGain };

      // Smooth master fade in
      masterGain.gain.rampTo(0.5, fadeIn);

      // Set up timer
      startTimeRef.current = Date.now();
      let remaining = opts.durationSec;
      opts.onTick?.(remaining);

      timerRef.current = setInterval(() => {
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

  // Cleanup on unmount only
  React.useEffect(() => {
    return () => {
      stopRef.current();
    };
  }, []);

  return { start, stop };
}
