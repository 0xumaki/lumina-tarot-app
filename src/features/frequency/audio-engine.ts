"use client";

import * as React from "react";
import * as Tone from "tone";

/**
 * Lumina Frequency Engine — powered by Tone.js.
 * MIT license, 14.7k stars, 254k weekly downloads.
 * Provides Oscillator, Gain, Filter, LFO, Merge abstractions over Web Audio.
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
    filter: Tone.Filter | null;
    merger: Tone.Merge | null;
  } | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = React.useRef(0);

  // Use a ref to hold the latest stop function so cleanup doesn't change identity
  const stopRef = React.useRef<() => number>(() => 0);

  const stop = React.useCallback(() => {
    // Clear the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const nodes = nodesRef.current;
    if (nodes) {
      try {
        // Fade out gains
        nodes.gains.forEach((g) => {
          try {
            g.gain.cancelScheduledValues(Tone.now());
            g.gain.setValueAtTime(g.gain.value, Tone.now());
            g.gain.rampTo(0.0001, 0.4);
          } catch {}
        });
        // Dispose after fade
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
          try { nodes.filter?.dispose(); } catch {}
          try { nodes.merger?.dispose(); } catch {}
        }, 500);
      } catch {}
      nodesRef.current = null;
    }

    const played = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0;
    startTimeRef.current = 0;
    return played;
  }, []);

  // Keep the ref in sync (in useEffect to avoid updating ref during render)
  React.useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const start = React.useCallback(
    async (opts: StartOptions) => {
      // Stop any existing session first (synchronously)
      stop();

      // Ensure audio context is running — don't use Tone.start() as it can hang
      // Instead, directly resume the context (Tone.js uses the same AudioContext)
      try {
        const ctx = Tone.getContext();
        if (ctx.state !== "running") {
          // Fire and forget — don't await, just try to resume
          ctx.resume().catch(() => {});
        }
      } catch (err) {
        console.error("[Lumina Audio] Context resume failed:", err);
      }

      const fade = 1.5;

      // Master chain: filter → destination
      const filter = new Tone.Filter({
        type: "lowpass",
        frequency: 5000,
        Q: 0.5,
      }).toDestination();

      const oscillators: Tone.Oscillator[] = [];
      const gains: Tone.Gain[] = [];
      const lfos: Tone.LFO[] = [];
      let merger: Tone.Merge | null = null;

      if (opts.mode === "pure") {
        const fundGain = new Tone.Gain(0).connect(filter);
        gains.push(fundGain);

        const fundamental = new Tone.Oscillator({
          frequency: opts.carrierHz,
          type: "sine",
          volume: -6,
        }).connect(fundGain);
        fundamental.start();
        oscillators.push(fundamental);

        const harmGain = new Tone.Gain(0).connect(filter);
        gains.push(harmGain);

        const harmonic = new Tone.Oscillator({
          frequency: opts.carrierHz * 2,
          type: "sine",
          volume: -12,
        }).connect(harmGain);
        harmonic.start();
        oscillators.push(harmonic);

        // Fade in
        fundGain.gain.rampTo(0.7, fade);
        harmGain.gain.rampTo(0.15, fade);
      } else if (opts.mode === "binaural") {
        merger = new Tone.Merge(2).connect(filter);

        const beat = opts.binauralBeatHz || 7;
        const leftFreq = opts.carrierHz - beat / 2;
        const rightFreq = opts.carrierHz + beat / 2;

        // Left channel
        const leftGain = new Tone.Gain(0).connect(merger, 0, 0);
        gains.push(leftGain);

        const left = new Tone.Oscillator({
          frequency: leftFreq,
          type: "sine",
          volume: -6,
        }).connect(leftGain);
        left.start();
        oscillators.push(left);

        const leftHarmGain = new Tone.Gain(0).connect(leftGain);
        gains.push(leftHarmGain);
        const leftHarm = new Tone.Oscillator({
          frequency: leftFreq * 2,
          type: "sine",
          volume: -18,
        }).connect(leftHarmGain);
        leftHarm.start();
        oscillators.push(leftHarm);

        // Right channel
        const rightGain = new Tone.Gain(0).connect(merger, 0, 1);
        gains.push(rightGain);

        const right = new Tone.Oscillator({
          frequency: rightFreq,
          type: "sine",
          volume: -6,
        }).connect(rightGain);
        right.start();
        oscillators.push(right);

        const rightHarmGain = new Tone.Gain(0).connect(rightGain);
        gains.push(rightHarmGain);
        const rightHarm = new Tone.Oscillator({
          frequency: rightFreq * 2,
          type: "sine",
          volume: -18,
        }).connect(rightHarmGain);
        rightHarm.start();
        oscillators.push(rightHarm);

        // Fade in
        leftGain.gain.rampTo(0.6, fade);
        rightGain.gain.rampTo(0.6, fade);
      } else {
        // pad
        const padGain = new Tone.Gain(0).connect(filter);
        gains.push(padGain);

        const freqs = [
          { freq: opts.carrierHz, type: "sine" as Tone.ToneOscillatorType, gain: 0.5 },
          { freq: opts.carrierHz * 1.005, type: "sine" as Tone.ToneOscillatorType, gain: 0.3 },
          { freq: opts.carrierHz * 1.5, type: "sine" as Tone.ToneOscillatorType, gain: 0.25 },
          { freq: opts.carrierHz * 0.5, type: "triangle" as Tone.ToneOscillatorType, gain: 0.15 },
        ];

        for (const f of freqs) {
          const oscGain = new Tone.Gain(f.gain).connect(padGain);
          gains.push(oscGain);

          const osc = new Tone.Oscillator({
            frequency: f.freq,
            type: f.type,
            volume: -8,
          }).connect(oscGain);
          osc.start();
          oscillators.push(osc);

          const lfo = new Tone.LFO({
            frequency: 0.12,
            min: f.freq - 1.5,
            max: f.freq + 1.5,
          }).connect(osc.frequency);
          lfo.start();
          lfos.push(lfo);
        }

        // Fade in
        padGain.gain.rampTo(0.4, fade);
      }

      // Store all nodes
      nodesRef.current = { oscillators, gains, lfos, filter, merger };

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

  // Cleanup on unmount only — use empty deps + ref
  React.useEffect(() => {
    return () => {
      stopRef.current();
    };
  }, []);

  return { start, stop };
}
