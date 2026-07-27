"use client";

import * as React from "react";

type Mode = "pure" | "binaural" | "pad";

interface StartOptions {
  carrierHz: number;
  binauralBeatHz: number;
  mode: Mode;
  durationSec: number;
  onTick?: (secondsLeft: number) => void;
  onEnd?: () => void;
}

/**
 * Web Audio engine for Lumina frequencies.
 * - pure: single sine oscillator at carrierHz, gentle gain envelope.
 * - binaural: two oscillators (left/right) offset by binauralBeatHz/2.
 * - pad: layered detuned oscillators (carrier + perfect fifth) + slow LFO vibrato.
 *
 * Includes a soft fade-in/out to avoid clicks, and a master gain limiter.
 */
export function useFrequencyEngine() {
  const ctxRef = React.useRef<AudioContext | null>(null);
  const nodesRef = React.useRef<{ stop: () => void } | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = React.useRef<number>(0);

  const ensureCtx = React.useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctxRef.current = new AC();
    }
    return ctxRef.current;
  }, []);

  const stop = React.useCallback(() => {
    const nodes = nodesRef.current;
    const ctx = ctxRef.current;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (nodes) {
      try { nodes.stop(); } catch {}
      nodesRef.current = null;
    }
    const played = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0;
    startTimeRef.current = 0;
    return played;
  }, []);

  const start = React.useCallback(
    (opts: StartOptions) => {
      // stop any existing
      stop();
      const ctx = ensureCtx();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;
      const fade = 1.5; // seconds fade in/out — longer for smoother entry
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.45, now + fade); // increased from 0.18 → 0.45
      master.connect(ctx.destination);

      // Add a gentle lowpass filter for warmth
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 5000;
      filter.Q.value = 0.5;
      filter.connect(master);

      const created: { oscillators: OscillatorNode[]; lfos?: OscillatorNode[] } = { oscillators: [] };

      const mkOsc = (freq: number, type: OscillatorType = "sine") => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(freq, now);
        return o;
      };

      if (opts.mode === "pure") {
        // Rich pure tone: fundamental + subtle octave harmonic for fullness
        const fundamental = mkOsc(opts.carrierHz, "sine");
        const fundGain = ctx.createGain();
        fundGain.gain.value = 0.7;
        fundamental.connect(fundGain);
        fundGain.connect(filter);
        fundamental.start(now);

        const harmonic = mkOsc(opts.carrierHz * 2, "sine");
        const harmGain = ctx.createGain();
        harmGain.gain.value = 0.15;
        harmonic.connect(harmGain);
        harmGain.connect(filter);
        harmonic.start(now);

        created.oscillators.push(fundamental, harmonic);
      } else if (opts.mode === "binaural") {
        // Stereo binaural with richer per-channel harmonics
        const merger = ctx.createChannelMerger(2);
        const leftGain = ctx.createGain();
        const rightGain = ctx.createGain();
        leftGain.gain.value = 0.6;
        rightGain.gain.value = 0.6;
        const beat = opts.binauralBeatHz || 7;
        const leftFreq = opts.carrierHz - beat / 2;
        const rightFreq = opts.carrierHz + beat / 2;

        // Left channel: fundamental + harmonic
        const left = mkOsc(leftFreq, "sine");
        const leftHarm = mkOsc(leftFreq * 2, "sine");
        const leftHarmGain = ctx.createGain();
        leftHarmGain.gain.value = 0.12;
        left.connect(leftGain);
        leftHarm.connect(leftHarmGain);
        leftHarmGain.connect(leftGain);
        leftGain.connect(merger, 0, 0);
        left.start(now);
        leftHarm.start(now);

        // Right channel: fundamental + harmonic
        const right = mkOsc(rightFreq, "sine");
        const rightHarm = mkOsc(rightFreq * 2, "sine");
        const rightHarmGain = ctx.createGain();
        rightHarmGain.gain.value = 0.12;
        right.connect(rightGain);
        rightHarm.connect(rightHarmGain);
        rightHarmGain.connect(rightGain);
        rightGain.connect(merger, 0, 1);
        right.start(now);
        rightHarm.start(now);

        merger.connect(filter);
        created.oscillators.push(left, right, leftHarm, rightHarm);
      } else {
        // pad — layered detuned oscillators with triangle wave for warmth
        const fifth = opts.carrierHz * 1.5;
        const oct = opts.carrierHz * 2;
        const freqs = [
          { freq: opts.carrierHz, type: "sine" as OscillatorType, gain: 0.5 },
          { freq: opts.carrierHz * 1.005, type: "sine" as OscillatorType, gain: 0.3 },
          { freq: fifth, type: "sine" as OscillatorType, gain: 0.25 },
          { freq: oct * 0.5, type: "triangle" as OscillatorType, gain: 0.15 },
        ];
        const padGain = ctx.createGain();
        padGain.gain.value = 0.4;
        padGain.connect(filter);
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.12;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 1.5;
        lfo.connect(lfoGain);
        lfo.start(now);
        created.lfos = [lfo];
        for (const f of freqs) {
          const o = mkOsc(f.freq, f.type);
          const g = ctx.createGain();
          g.gain.value = f.gain;
          lfoGain.connect(o.frequency);
          o.connect(g);
          g.connect(padGain);
          o.start(now);
          created.oscillators.push(o);
        }
      }

      const stopAll = () => {
        const t = ctx.currentTime;
        try {
          master.gain.cancelScheduledValues(t);
          master.gain.setValueAtTime(master.gain.value, t);
          master.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        } catch {}
        const killAt = t + 0.6;
        for (const o of created.oscillators) {
          try { o.stop(killAt); } catch {}
        }
        for (const l of created.lfos || []) {
          try { l.stop(killAt); } catch {}
        }
      };
      nodesRef.current = { stop: stopAll };

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
    [ensureCtx, stop]
  );

  React.useEffect(() => () => stop(), [stop]);

  return { start, stop };
}
