"use client";

import * as React from "react";

/**
 * Lumina Sound Engine — synthesizes ritual sounds via Web Audio API.
 * No audio files needed; all sounds are generated procedurally.
 *
 * Sounds:
 * - shuffle: filtered noise burst (card rustle)
 * - flip: short whoosh (card reveal)
 * - bell: singing bowl tone (goal confirmation)
 * - chime: soft success chime (milestone)
 * - whoosh: ambient transition
 */

type SoundName = "shuffle" | "flip" | "bell" | "chime" | "whoosh" | "tap";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = true;

  constructor() {
    if (typeof window !== "undefined") {
      // Load preference
      try {
        this.enabled = localStorage.getItem("lumina.sound") !== "off";
      } catch {}
    }
  }

  private ensureCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    try { localStorage.setItem("lumina.sound", on ? "on" : "off"); } catch {}
  }

  isEnabled() {
    return this.enabled;
  }

  play(sound: SoundName) {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterGain) return;

    switch (sound) {
      case "shuffle":
        this.shuffle(ctx);
        break;
      case "flip":
        this.flip(ctx);
        break;
      case "bell":
        this.bell(ctx);
        break;
      case "chime":
        this.chime(ctx);
        break;
      case "whoosh":
        this.whoosh(ctx);
        break;
      case "tap":
        this.tap(ctx);
        break;
    }
  }

  /** Card shuffle — filtered white noise burst with amplitude envelope. */
  private shuffle(ctx: AudioContext) {
    const duration = 0.5;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter for a "rustle" quality
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2000;
    filter.Q.value = 0.8;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    noise.start(now);
    noise.stop(now + duration);
  }

  /** Card flip — short whoosh with pitch sweep. */
  private flip(ctx: AudioContext) {
    const now = ctx.currentTime;
    const duration = 0.25;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + duration);
  }

  /** Singing bowl — rich harmonic tone with long decay. */
  private bell(ctx: AudioContext) {
    const now = ctx.currentTime;
    const duration = 2.5;
    const fundamental = 440; // A4

    // Singing bowl harmonics
    const harmonics = [
      { freq: fundamental, gain: 0.4 },
      { freq: fundamental * 2.76, gain: 0.2 },
      { freq: fundamental * 5.4, gain: 0.1 },
      { freq: fundamental * 8.93, gain: 0.05 },
    ];

    harmonics.forEach((h, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = h.freq;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(h.gain, now + 0.02 + i * 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Slight vibrato
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 4 + i;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = h.freq * 0.005;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now);
      lfo.stop(now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + duration);
    });
  }

  /** Success chime — ascending two-note arpeggio. */
  private chime(ctx: AudioContext) {
    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, time: 0 },     // C5
      { freq: 659.25, time: 0.08 },  // E5
      { freq: 783.99, time: 0.16 },  // G5
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = n.freq;

      const gain = ctx.createGain();
      const start = now + n.time;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 0.6);
    });
  }

  /** Whoosh — filtered noise sweep for transitions. */
  private whoosh(ctx: AudioContext) {
    const now = ctx.currentTime;
    const duration = 0.4;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + duration * 0.5);
    filter.frequency.exponentialRampToValueAtTime(200, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    noise.start(now);
    noise.stop(now + duration);
  }

  /** Soft tap — tiny click for button presses. */
  private tap(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 1200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

// Singleton
let engine: SoundEngine | null = null;

export function getSoundEngine(): SoundEngine {
  if (!engine) {
    engine = new SoundEngine();
  }
  return engine;
}

/** React hook for playing sounds. */
export function useSound() {
  return React.useCallback((sound: SoundName) => {
    getSoundEngine().play(sound);
  }, []);
}

/** React hook for the sound enabled state (for a toggle in settings). */
export function useSoundEnabled() {
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    setEnabled(getSoundEngine().isEnabled());
  }, []);

  const toggle = React.useCallback((on: boolean) => {
    getSoundEngine().setEnabled(on);
    setEnabled(on);
  }, []);

  return { enabled, toggle };
}
