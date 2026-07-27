"use client";

import * as React from "react";
import * as Tone from "tone";

/**
 * Lumina Frequency Engine — powered by Tone.js.
 *
 * Research-driven decision: Selected Tone.js over alternatives based on:
 *
 * | Library          | License | Stars  | Weekly DLs | Bundle  | Binaural | Solfeggio | Web Audio |
 * |------------------|---------|--------|------------|---------|----------|-----------|-----------|
 * | Tone.js          | MIT     | 14.7k  | 254k       | ~100KB* | ✅ (stereo) | ✅       | ✅ Native |
 * | Superpowered SDK | Proprietary | —   | —          | WASM    | ✅       | ✅        | ✅ WASM   |
 * | ZenTone          | Apache-2| 370    | —          | Android | ❌       | ❌        | ❌ Android|
 * | 1ps0/binaural    | None    | <50    | —          | Vanilla | ✅       | ✅        | ✅ Raw    |
 * | Raw Web Audio    | N/A     | N/A    | N/A        | 0KB     | DIY      | DIY       | ✅ Native |
 *
 * *Tone.js supports tree-shaking; importing just Oscillator + Gain + Filter
 * brings the actual payload to ~40-60KB gzip.
 *
 * Decision: Tone.js
 * - MIT license (unlike Superpowered's proprietary case-by-case licensing)
 * - 14.7k stars, 254k weekly downloads, actively maintained (last push Jul 2026)
 * - Native Web Audio (no WASM overhead, unlike Superpowered)
 * - Supports binaural (stereo channel merging), filters, LFOs, envelopes
 * - Cross-browser compatible (unlike ZenTone which is Android-only)
 * - Well-documented Oscillator, Gain, Filter, Merge nodes
 *
 * Rejected alternatives:
 * - Superpowered: Proprietary license, WASM complexity, overkill for tone generation
 * - ZenTone: Android-only (Kotlin/Java), not web-compatible
 * - 1ps0/binaural: No license, unmaintained, no npm package
 * - Raw Web Audio: Already implemented but lacked Tone.js's envelope/filter abstractions
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
    lfos?: Tone.LFO[];
    filter?: Tone.Filter;
    merger?: Tone.Merge;
  } | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = React.useState({ current: 0 })[0] as any;
  const startedRef = React.useRef(false);

  const stop = React.useCallback(() => {
    const nodes = nodesRef.current;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (nodes) {
      try {
        // Fade out then dispose
        nodes.gains.forEach((g) => {
          try { g.gain.rampTo(0.0001, 0.5); } catch {}
        });
        setTimeout(() => {
          nodes.oscillators.forEach((o) => {
            try { o.stop(); o.dispose(); } catch {}
          });
          nodes.gains.forEach((g) => {
            try { g.dispose(); } catch {}
          });
          nodes.lfos?.forEach((l) => {
            try { l.stop(); l.dispose(); } catch {}
          });
          nodes.filter?.dispose();
          nodes.merger?.dispose();
        }, 600);
      } catch {}
      nodesRef.current = null;
    }
    const played = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0;
    startTimeRef.current = 0;
    startedRef.current = false;
    return played;
  }, []);

  const start = React.useCallback(
    async (opts: StartOptions) => {
      // stop any existing
      stop();

      // Ensure Tone.js audio context is started (requires user gesture)
      await Tone.start();

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

      if (opts.mode === "pure") {
        // Rich pure tone: fundamental + octave harmonic
        const fundGain = new Tone.Gain(0.7).connect(filter);
        gains.push(fundGain);

        const fundamental = new Tone.Oscillator({
          frequency: opts.carrierHz,
          type: "sine",
          volume: -6,
        }).connect(fundGain);
        fundamental.start();
        oscillators.push(fundamental);

        const harmGain = new Tone.Gain(0.15).connect(filter);
        gains.push(harmGain);

        const harmonic = new Tone.Oscillator({
          frequency: opts.carrierHz * 2,
          type: "sine",
          volume: -12,
        }).connect(harmGain);
        harmonic.start();
        oscillators.push(harmonic);

        // Fade in
        fundGain.gain.setValueAtTime(0, Tone.now());
        fundGain.gain.rampTo(0.7, fade);
        harmGain.gain.setValueAtTime(0, Tone.now());
        harmGain.gain.rampTo(0.15, fade);
      } else if (opts.mode === "binaural") {
        // Stereo binaural with per-channel harmonics
        const merger = new Tone.Merge(2).connect(filter);

        const beat = opts.binauralBeatHz || 7;
        const leftFreq = opts.carrierHz - beat / 2;
        const rightFreq = opts.carrierHz + beat / 2;

        // Left channel
        const leftGain = new Tone.Gain(0.6).connect(merger, 0, 0);
        gains.push(leftGain);

        const left = new Tone.Oscillator({
          frequency: leftFreq,
          type: "sine",
          volume: -6,
        }).connect(leftGain);
        left.start();
        oscillators.push(left);

        const leftHarmGain = new Tone.Gain(0.12).connect(leftGain);
        gains.push(leftHarmGain);
        const leftHarm = new Tone.Oscillator({
          frequency: leftFreq * 2,
          type: "sine",
          volume: -18,
        }).connect(leftHarmGain);
        leftHarm.start();
        oscillators.push(leftHarm);

        // Right channel
        const rightGain = new Tone.Gain(0.6).connect(merger, 0, 1);
        gains.push(rightGain);

        const right = new Tone.Oscillator({
          frequency: rightFreq,
          type: "sine",
          volume: -6,
        }).connect(rightGain);
        right.start();
        oscillators.push(right);

        const rightHarmGain = new Tone.Gain(0.12).connect(rightGain);
        gains.push(rightHarmGain);
        const rightHarm = new Tone.Oscillator({
          frequency: rightFreq * 2,
          type: "sine",
          volume: -18,
        }).connect(rightHarmGain);
        rightHarm.start();
        oscillators.push(rightHarm);

        // Fade in
        leftGain.gain.setValueAtTime(0, Tone.now());
        leftGain.gain.rampTo(0.6, fade);
        rightGain.gain.setValueAtTime(0, Tone.now());
        rightGain.gain.rampTo(0.6, fade);
      } else {
        // pad — layered detuned oscillators with triangle warmth + LFO vibrato
        const padGain = new Tone.Gain(0.4).connect(filter);
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

          // LFO vibrato
          const lfo = new Tone.LFO({
            frequency: 0.12,
            min: f.freq - 1.5,
            max: f.freq + 1.5,
          }).connect(osc.frequency);
          lfo.start();
          lfos.push(lfo);
        }

        // Fade in
        padGain.gain.setValueAtTime(0, Tone.now());
        padGain.gain.rampTo(0.4, fade);
      }

      nodesRef.current = { oscillators, gains, lfos, filter };

      startTimeRef.current = Date.now();
      startedRef.current = true;
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

  React.useEffect(() => () => stop(), [stop]);

  return { start, stop };
}
