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
      const fade = 1.2; // seconds fade in/out
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.18, now + fade);
      master.connect(ctx.destination);

      const created: { oscillators: OscillatorNode[]; lfos?: OscillatorNode[] } = { oscillators: [] };

      const mkOsc = (freq: number, type: OscillatorType = "sine") => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(freq, now);
        return o;
      };

      if (opts.mode === "pure") {
        const o = mkOsc(opts.carrierHz);
        o.connect(master);
        o.start(now);
        created.oscillators.push(o);
      } else if (opts.mode === "binaural") {
        // stereo splitter
        const merger = ctx.createChannelMerger(2);
        const leftGain = ctx.createGain();
        const rightGain = ctx.createGain();
        leftGain.gain.value = 0.5;
        rightGain.gain.value = 0.5;
        const beat = opts.binauralBeatHz || 7;
        const leftFreq = opts.carrierHz - beat / 2;
        const rightFreq = opts.carrierHz + beat / 2;
        const left = mkOsc(leftFreq);
        const right = mkOsc(rightFreq);
        left.connect(leftGain);
        right.connect(rightGain);
        leftGain.connect(merger, 0, 0);
        rightGain.connect(merger, 0, 1);
        merger.connect(master);
        left.start(now);
        right.start(now);
        created.oscillators.push(left, right);
      } else {
        // pad — layered detuned sines + a perfect fifth, with slow vibrato LFO
        const fifth = opts.carrierHz * 1.5;
        const oct = opts.carrierHz * 2;
        const freqs = [opts.carrierHz, opts.carrierHz * 1.005, fifth, oct * 0.5];
        const padGain = ctx.createGain();
        padGain.gain.value = 0.32;
        padGain.connect(master);
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.12;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 1.2;
        lfo.connect(lfoGain);
        lfo.start(now);
        created.lfos = [lfo];
        for (const f of freqs) {
          const o = mkOsc(f, "sine");
          lfoGain.connect(o.frequency);
          o.connect(padGain);
          o.start(now);
          created.oscillators.push(o);
        }
      }

      const stopAll = () => {
        const t = ctx.currentTime;
        try {
          master.gain.cancelScheduledValues(t);
          master.gain.setValueAtTime(master.gain.value, t);
          master.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        } catch {}
        const killAt = t + 0.5;
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
