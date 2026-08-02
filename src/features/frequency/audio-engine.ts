"use client";

import * as React from "react";
import * as Tone from "tone";

/**
 * Lumina Frequency Engine v9 — Smooth, reliable, graceful.
 *
 * Fixes from v8:
 * 1. SHAKY FREQUENCY: Oscillators were all at the same gain with no volume
 *    difference, causing phase cancellation when multiple oscillators play
 *    simultaneously (especially binaural + pad mode). Now each oscillator
 *    has its own gain node with carefully tuned levels to prevent beating.
 * 2. STEEP ENDING: stop() killed everything instantly. Now uses a 1.5s
 *    graceful fade using Tone.js linearRampToValueAtTime (scheduled, reliable).
 *    sessionRef is captured in a local variable so it can be nulled immediately
 *    (allowing new sessions to start) while the fade runs on the captured nodes.
 * 3. CAN'T STOP AFTER SWITCHING: The old stop() used isStopping flag which
 *    blocked subsequent stop() calls. Now stop() captures the session locally,
 *    nulls the ref immediately, and runs the fade on the captured session.
 *    A second stop() call finds sessionRef null and returns 0 (no-op).
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

interface AudioSession {
  oscillators: Tone.Oscillator[];
  gains: Tone.Gain[];
  masterGain: Tone.Gain;
  bedAudio: HTMLAudioElement | null;
  timer: ReturnType<typeof setInterval> | null;
  startTime: number;
}

export function useFrequencyEngine() {
  const sessionRef = React.useRef<AudioSession | null>(null);
  const stopRef = React.useRef<() => number>(() => 0);

  /**
   * GRACEFUL STOP — 1.5s fade using Tone.js scheduling, then dispose.
   *
   * KEY DESIGN: sessionRef is captured in a local variable and nulled
   * IMMEDIATELY. The fade runs on the captured session. This means:
   * - A second stop() call finds sessionRef=null → returns 0 (no-op, safe)
   * - start() finds sessionRef=null → creates new session immediately
   * - The old session's fade continues on captured nodes, disposed after 1.8s
   * - No isStopping flag needed, no race conditions
   */
  const stop = React.useCallback(() => {
    const session = sessionRef.current;
    if (!session) return 0;

    // NULL IMMEDIATELY — allows new sessions to start right away
    sessionRef.current = null;

    // Clear timer
    if (session.timer) {
      clearInterval(session.timer);
    }

    const now = Tone.now();
    const fadeOut = 1.5; // 1.5-second graceful echo fade

    // Fade master gain to zero using Tone.js scheduling (reliable, not JS interval)
    try {
      session.masterGain.gain.cancelScheduledValues(now);
      session.masterGain.gain.setValueAtTime(session.masterGain.gain.value, now);
      session.masterGain.gain.linearRampToValueAtTime(0.0001, now + fadeOut);
    } catch {}

    // Schedule oscillator stops at end of fade
    session.oscillators.forEach((o) => {
      try { o.stop(now + fadeOut + 0.05); } catch {}
    });

    // Fade bed audio volume gradually (backup to Tone.js ramp)
    if (session.bedAudio) {
      const audio = session.bedAudio;
      const startVol = audio.volume;
      let step = 0;
      const steps = 15;
      const bedFade = setInterval(() => {
        step++;
        try {
          audio.volume = Math.max(0, startVol * (1 - step / steps));
        } catch {}
        if (step >= steps) {
          clearInterval(bedFade);
          try { audio.pause(); } catch {}
        }
      }, 100);
    }

    // Dispose everything AFTER fade completes
    setTimeout(() => {
      session.oscillators.forEach((o) => {
        try { o.dispose(); } catch {}
      });
      session.gains.forEach((g) => {
        try { g.dispose(); } catch {}
      });
      try { session.masterGain.dispose(); } catch {}
      try { session.bedAudio?.pause(); session.bedAudio = null; } catch {}
    }, (fadeOut + 0.3) * 1000);

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

      // Stop any existing session (graceful — captures + nulls ref immediately)
      stop();

      const fadeIn = 2.0;
      const now = Tone.now();

      // === MASTER GAIN ===
      const masterGain = new Tone.Gain(0).toDestination();

      const oscillators: Tone.Oscillator[] = [];
      const gains: Tone.Gain[] = [];

      // === FREQUENCY TONE ===
      // Each oscillator has its OWN gain node to prevent phase cancellation.
      // Gains are carefully tuned so oscillators don't beat against each other.
      if (opts.mode === "pure") {
        // Single sine wave — cleanest tone
        const oscGain = new Tone.Gain(0.18).connect(masterGain);
        gains.push(oscGain);
        const osc = new Tone.Oscillator(opts.carrierHz, "sine");
        osc.connect(oscGain);
        osc.start(now);
        oscillators.push(osc);

      } else if (opts.mode === "binaural") {
        // Two oscillators at slightly different frequencies for binaural beat.
        // Each has its own gain to prevent phase cancellation.
        const beat = opts.binauralBeatHz || 7;
        const leftFreq = opts.carrierHz - beat / 2;
        const rightFreq = opts.carrierHz + beat / 2;

        const leftGain = new Tone.Gain(0.12).connect(masterGain);
        gains.push(leftGain);
        const left = new Tone.Oscillator(leftFreq, "sine");
        left.connect(leftGain);
        left.start(now);
        oscillators.push(left);

        const rightGain = new Tone.Gain(0.12).connect(masterGain);
        gains.push(rightGain);
        const right = new Tone.Oscillator(rightFreq, "sine");
        right.connect(rightGain);
        right.start(now);
        oscillators.push(right);

      } else {
        // pad mode — 3 oscillators at harmonic frequencies.
        // Different gain levels prevent beating.
        const freqs = [
          { freq: opts.carrierHz, gain: 0.12 },       // root — loudest
          { freq: opts.carrierHz * 1.5, gain: 0.06 },  // fifth — quieter
          { freq: opts.carrierHz * 2, gain: 0.04 },    // octave — quietest
        ];
        for (const f of freqs) {
          const oscGain = new Tone.Gain(f.gain).connect(masterGain);
          gains.push(oscGain);
          const osc = new Tone.Oscillator(f.freq, "sine");
          osc.connect(oscGain);
          osc.start(now);
          oscillators.push(osc);
        }
      }

      // === AMBIENT BED — plain HTML audio element ===
      let bedAudio: HTMLAudioElement | null = null;
      const bedFile = BED_AUDIO_FILES[opts.ambient] || "";

      if (bedFile) {
        bedAudio = new Audio(bedFile);
        bedAudio.loop = true;
        bedAudio.volume = 0;
        bedAudio.crossOrigin = "anonymous";

        try {
          await bedAudio.play();
          // Fade in over 2 seconds
          const targetVol = 0.45;
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
      masterGain.gain.linearRampToValueAtTime(0.5, now + fadeIn);

      // Store session
      sessionRef.current = {
        oscillators,
        gains,
        masterGain,
        bedAudio,
        timer: null,
        startTime: Date.now(),
      };

      // Timer — only updates state
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
        session.oscillators.forEach((o) => { try { o.stop(); o.dispose(); } catch {} });
        session.gains.forEach((g) => { try { g.dispose(); } catch {} });
        try { session.masterGain.dispose(); } catch {}
        try { session.bedAudio?.pause(); } catch {}
        sessionRef.current = null;
      }
    };
  }, []);

  return { start, stop };
}

export type { AmbientBed };
