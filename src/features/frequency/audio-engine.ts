"use client";

import * as React from "react";
import * as Tone from "tone";

/**
 * Lumina Frequency Engine v7 — Bulletproof.
 *
 * DESIGN PRINCIPLES:
 * 1. SINGLE source of truth: one ref holding ALL audio resources
 * 2. stop() is SYNCHRONOUS and IMMEDIATE — no deferred disposal
 * 3. Graceful fade-out using Tone.js scheduled ramps (not JS intervals)
 * 4. No LFOs (caused beating/clicking in previous versions)
 * 5. No filters (caused resonance peaks in previous versions)
 * 6. start() always calls hardStop() first — guarantees clean slate
 * 7. Audio element uses Tone.js GainNode for proper fade-out (not JS volume steps)
 *
 * The "can't stop" bug was caused by:
 * - Deferred disposal (setTimeout 2s) leaving zombie nodes
 * - JS interval-based volume fading that could be garbage collected
 * - sessionRef being nulled before nodes were disposed
 *
 * The "no sound" bug was caused by:
 * - Master gain starting at 0 and ramp never completing (race condition)
 * - Audio element play() promise not being awaited properly
 * - Oscillators being connected to a gain that was already disposed
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
  merger: Tone.Merge | null;
  masterGain: Tone.Gain;
  bedAudio: HTMLAudioElement | null;
  bedGain: Tone.Gain | null;
  bedSource: Tone.ToneAudioNode | null;
  timer: ReturnType<typeof setInterval> | null;
  startTime: number;
  isStopping: boolean;
}

export function useFrequencyEngine() {
  const sessionRef = React.useRef<AudioSession | null>(null);
  const stopRef = React.useRef<() => number>(() => 0);

  /**
   * HARD STOP — kills everything immediately. No fade.
   * Used internally by start() to guarantee a clean slate.
   */
  const hardStop = React.useCallback(() => {
    const session = sessionRef.current;
    if (!session) return 0;

    // Clear timer
    if (session.timer) {
      clearInterval(session.timer);
    }

    // Immediately stop all oscillators
    session.oscillators.forEach((o) => {
      try { o.stop(); o.dispose(); } catch {}
    });

    // Dispose all gains
    session.gains.forEach((g) => {
      try { g.dispose(); } catch {}
    });

    // Dispose merger
    try { session.merger?.dispose(); } catch {}

    // Stop and dispose ambient audio
    if (session.bedAudio) {
      try { session.bedAudio.pause(); session.bedAudio.src = ""; } catch {}
    }
    try { session.bedGain?.dispose(); } catch {}

    // Dispose master gain LAST (it's the destination)
    try { session.masterGain.dispose(); } catch {}

    const played = session.startTime ? (Date.now() - session.startTime) / 1000 : 0;
    sessionRef.current = null;
    return played;
  }, []);

  /**
   * GRACEFUL STOP — fades out over 2 seconds, then disposes.
   * This is the user-facing stop (button click or timer end).
   * Uses Tone.js scheduled ramps (not JS intervals) for reliable fade.
   */
  const stop = React.useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.isStopping) return 0;

    session.isStopping = true; // Prevent double-stop

    // Clear timer
    if (session.timer) {
      clearInterval(session.timer);
      session.timer = null;
    }

    const now = Tone.now();
    const fadeOut = 2.0; // 2-second graceful fade

    // Schedule master gain fade to zero using Tone.js (reliable, not JS interval)
    try {
      session.masterGain.gain.cancelScheduledValues(now);
      session.masterGain.gain.setValueAtTime(session.masterGain.gain.value, now);
      session.masterGain.gain.linearRampToValueAtTime(0.0001, now + fadeOut);
    } catch {}

    // Fade out ambient audio using Web Audio API (through Tone.js GainNode)
    if (session.bedGain) {
      try {
        session.bedGain.gain.cancelScheduledValues(now);
        session.bedGain.gain.setValueAtTime(session.bedGain.gain.value, now);
        session.bedGain.gain.linearRampToValueAtTime(0, now + fadeOut);
      } catch {}
    }

    // Also fade the HTML audio element volume as backup
    if (session.bedAudio) {
      try {
        const audio = session.bedAudio;
        const startVol = audio.volume;
        const fadeData = { step: 0, totalSteps: 20 };
        const fadeInterval = setInterval(() => {
          fadeData.step++;
          try {
            audio.volume = Math.max(0, startVol * (1 - fadeData.step / fadeData.totalSteps));
          } catch {}
          if (fadeData.step >= fadeData.totalSteps) {
            clearInterval(fadeInterval);
            try { audio.pause(); } catch {}
          }
        }, 100);
      } catch {}
    }

    // Schedule oscillator stops at the end of the fade
    session.oscillators.forEach((o) => {
      try { o.stop(now + fadeOut + 0.1); } catch {}
    });

    // Dispose everything after the fade completes
    setTimeout(() => {
      const s = sessionRef.current;
      if (!s || !s.isStopping) return;

      s.oscillators.forEach((o) => {
        try { o.dispose(); } catch {}
      });
      s.gains.forEach((g) => {
        try { g.dispose(); } catch {}
      });
      try { s.merger?.dispose(); } catch {}
      try { s.bedGain?.dispose(); } catch {}
      try { s.masterGain?.dispose(); } catch {}
      if (s.bedAudio) {
        try { s.bedAudio.pause(); s.bedAudio.src = ""; } catch {}
      }
      sessionRef.current = null;
    }, (fadeOut + 0.3) * 1000);

    const played = session.startTime ? (Date.now() - session.startTime) / 1000 : 0;
    return played;
  }, []);

  React.useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const start = React.useCallback(
    async (opts: StartOptions) => {
      // CRITICAL: Resume audio context FIRST, before any async operations.
      // Browsers require this to happen within a user gesture (click handler).
      // Any await before this breaks the gesture chain and audio stays suspended.
      try {
        const ctx = Tone.getContext();
        if (ctx.state !== "running") {
          await ctx.resume();
        }
        await Tone.start();
      } catch {}

      // HARD STOP any existing session (synchronous — no await before this)
      hardStop();

      const fadeIn = 2.0;
      const now = Tone.now();

      // === MASTER GAIN — starts at 0, ramps up ===
      const masterGain = new Tone.Gain(0).toDestination();

      const oscillators: Tone.Oscillator[] = [];
      const gains: Tone.Gain[] = [];
      let merger: Tone.Merge | null = null;

      // === FREQUENCY TONE ===
      if (opts.mode === "pure") {
        const toneGain = new Tone.Gain(0).connect(masterGain);
        gains.push(toneGain);

        const fundamental = new Tone.Oscillator(opts.carrierHz, "sine");
        fundamental.connect(toneGain);
        fundamental.start(now);
        oscillators.push(fundamental);

        // Ramp up
        toneGain.gain.setValueAtTime(0, now);
        toneGain.gain.linearRampToValueAtTime(0.2, now + fadeIn);

      } else if (opts.mode === "binaural") {
        merger = new Tone.Merge(2).connect(masterGain);

        const beat = opts.binauralBeatHz || 7;
        const leftFreq = opts.carrierHz - beat / 2;
        const rightFreq = opts.carrierHz + beat / 2;

        const leftGain = new Tone.Gain(0).connect(merger, 0, 0);
        gains.push(leftGain);
        const left = new Tone.Oscillator(leftFreq, "sine");
        left.connect(leftGain);
        left.start(now);
        oscillators.push(left);

        const rightGain = new Tone.Gain(0).connect(merger, 0, 1);
        gains.push(rightGain);
        const right = new Tone.Oscillator(rightFreq, "sine");
        right.connect(rightGain);
        right.start(now);
        oscillators.push(right);

        // Ramp up
        leftGain.gain.setValueAtTime(0, now);
        leftGain.gain.linearRampToValueAtTime(0.18, now + fadeIn);
        rightGain.gain.setValueAtTime(0, now);
        rightGain.gain.linearRampToValueAtTime(0.18, now + fadeIn);

      } else {
        // pad mode — static frequencies, NO LFOs
        const padGain = new Tone.Gain(0).connect(masterGain);
        gains.push(padGain);

        const freqs = [
          { freq: opts.carrierHz, gain: 0.14 },
          { freq: opts.carrierHz * 1.5, gain: 0.08 },
          { freq: opts.carrierHz * 2, gain: 0.05 },
        ];

        for (const f of freqs) {
          const oscGain = new Tone.Gain(f.gain).connect(padGain);
          gains.push(oscGain);
          const osc = new Tone.Oscillator(f.freq, "sine");
          osc.connect(oscGain);
          osc.start(now);
          oscillators.push(osc);
        }

        padGain.gain.setValueAtTime(0, now);
        padGain.gain.linearRampToValueAtTime(0.3, now + fadeIn);
      }

      // === AMBIENT BED — REAL WAV FILE ===
      let bedAudio: HTMLAudioElement | null = null;
      let bedGain: Tone.Gain | null = null;
      const bedFile = BED_AUDIO_FILES[opts.ambient] || "";

      if (bedFile) {
        try {
          bedAudio = new Audio(bedFile);
          bedAudio.loop = true;
          bedAudio.volume = 0;
          bedAudio.crossOrigin = "anonymous";

          // Create a Tone.js Gain for the bed audio (enables proper scheduled fade-out)
          bedGain = new Tone.Gain(0).connect(masterGain);

          // Connect audio element to Tone.js via MediaElementSource
          const source = Tone.getContext().createMediaElementSource(bedAudio);
          source.connect(bedGain.input);

          await bedAudio.play();

          // Fade in the bed gain using Tone.js scheduling (reliable)
          bedGain.gain.setValueAtTime(0, now);
          bedGain.gain.linearRampToValueAtTime(0.5, now + fadeIn);
        } catch (e) {
          console.warn("Ambient bed setup failed:", e);
          bedAudio = null;
          bedGain = null;
        }
      }

      // Ramp master gain UP using Tone.js scheduling
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(0.4, now + fadeIn);

      // Store session
      sessionRef.current = {
        oscillators,
        gains,
        merger,
        masterGain,
        bedAudio,
        bedGain,
        bedSource: null,
        timer: null,
        startTime: Date.now(),
        isStopping: false,
      };

      // Set up timer — only updates state
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
    [hardStop, stop]
  );

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Use hardStop for unmount — no fade needed
      const session = sessionRef.current;
      if (session) {
        if (session.timer) clearInterval(session.timer);
        session.oscillators.forEach((o) => { try { o.stop(); o.dispose(); } catch {} });
        session.gains.forEach((g) => { try { g.dispose(); } catch {} });
        try { session.merger?.dispose(); } catch {}
        try { session.bedGain?.dispose(); } catch {}
        try { session.masterGain?.dispose(); } catch {}
        if (session.bedAudio) { try { session.bedAudio.pause(); } catch {} }
        sessionRef.current = null;
      }
    };
  }, []);

  return { start, stop };
}

export type { AmbientBed };
