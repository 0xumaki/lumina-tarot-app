"use client";

import * as React from "react";
import * as Tone from "tone";

/**
 * Lumina Frequency Engine v4 — Smooth, glitch-free, with selectable ambient beds.
 *
 * Key anti-click measures:
 * 1. All oscillators start at gain=0, then ramp up over 3s
 * 2. All oscillators ramp to 0 over 2s before stop/dispose
 * 3. Master gain never changes abruptly — always ramped
 * 4. No nodes are created or destroyed during playback
 * 5. The timer interval only updates React state — it never touches audio nodes
 * 6. Ambient bed oscillators run continuously, only gain changes
 */

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

export function useFrequencyEngine() {
  const sessionRef = React.useRef<{
    oscillators: Tone.Oscillator[];
    gains: Tone.Gain[];
    lfos: Tone.LFO[];
    noise: Tone.Noise | null;
    noiseFilter: Tone.Filter | null;
    noiseGain: Tone.Gain | null;
    filter: Tone.Filter | null;
    merger: Tone.Merge | null;
    masterGain: Tone.Gain | null;
    bedGain: Tone.Gain | null;
    timer: ReturnType<typeof setInterval> | null;
    startTime: number;
  } | null>(null);

  const stopRef = React.useRef<() => number>(() => 0);

  const stop = React.useCallback(() => {
    const session = sessionRef.current;
    if (!session) return 0;

    // Clear timer first — no more state updates
    if (session.timer) {
      clearInterval(session.timer);
      session.timer = null;
    }

    const now = Tone.now();
    const fadeOut = 2.0; // 2-second smooth fade out

    // Ramp ALL gains to zero smoothly
    try {
      if (session.masterGain) {
        session.masterGain.gain.cancelScheduledValues(now);
        session.masterGain.gain.setValueAtTime(session.masterGain.gain.value, now);
        session.masterGain.gain.rampTo(0.0001, fadeOut);
      }
    } catch {}

    // Dispose after fade completes
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
      try { s.noise?.stop(); } catch {}
      try { s.noise?.dispose(); } catch {}
      try { s.noiseFilter?.dispose(); } catch {}
      try { s.noiseGain?.dispose(); } catch {}
      try { s.filter?.dispose(); } catch {}
      try { s.merger?.dispose(); } catch {}
      try { s.masterGain?.dispose(); } catch {}
      try { s.bedGain?.dispose(); } catch {}
      sessionRef.current = null;
    }, fadeOut * 1000 + 200);

    const played = session.startTime ? (Date.now() - session.startTime) / 1000 : 0;
    sessionRef.current = null; // prevent double-stop
    return played;
  }, []);

  React.useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  /**
   * Create an ambient bed — synthesized relaxation sounds.
   * Returns nodes that are connected to the master gain.
   */
  function createAmbientBed(
    ambient: AmbientBed,
    masterGain: Tone.Gain
  ): { noise: Tone.Noise | null; noiseFilter: Tone.Filter | null; noiseGain: Tone.Gain | null; oscillators: Tone.Oscillator[]; gains: Tone.Gain[]; lfos: Tone.LFO[] } {
    const oscillators: Tone.Oscillator[] = [];
    const gains: Tone.Gain[] = [];
    const lfos: Tone.LFO[] = [];
    let noise: Tone.Noise | null = null;
    let noiseFilter: Tone.Filter | null = null;
    let noiseGain: Tone.Gain | null = null;

    if (ambient === "none") {
      return { noise: null, noiseFilter: null, noiseGain: null, oscillators, gains, lfos };
    }

    // Bed gain — controls the overall ambient bed volume
    const bedGain = new Tone.Gain(0).connect(masterGain);
    gains.push(bedGain);

    if (ambient === "ambient") {
      // === Rich ambient pad: evolving drone with harmonics ===
      // Multiple detuned sines creating a warm, evolving sound
      const baseFreq = 110; // A2 — low warm tone
      const padFreqs = [
        { freq: baseFreq, gain: 0.12, type: "sine" as Tone.ToneOscillatorType },
        { freq: baseFreq * 1.5, gain: 0.08, type: "sine" as Tone.ToneOscillatorType }, // perfect fifth
        { freq: baseFreq * 2, gain: 0.06, type: "sine" as Tone.ToneOscillatorType }, // octave
        { freq: baseFreq * 3, gain: 0.03, type: "sine" as Tone.ToneOscillatorType }, // perfect fifth + octave
      ];

      for (const f of padFreqs) {
        const g = new Tone.Gain(f.gain).connect(bedGain);
        gains.push(g);
        const osc = new Tone.Oscillator({
          frequency: f.freq,
          type: f.type,
          volume: -10,
        }).connect(g);
        osc.start();
        oscillators.push(osc);

        // Slow amplitude LFO for breathing quality
        const lfo = new Tone.LFO({
          frequency: 0.05 + Math.random() * 0.05,
          min: f.gain * 0.5,
          max: f.gain * 1.2,
        }).connect(g.gain);
        lfo.start();
        lfos.push(lfo);
      }

      // Soft pink noise underneath for warmth
      noise = new Tone.Noise("pink").start();
      noiseGain = new Tone.Gain(0.015).connect(bedGain);
      gains.push(noiseGain);
      noiseFilter = new Tone.Filter({
        type: "lowpass",
        frequency: 400,
        Q: 0.3,
      }).connect(noiseGain);
      noise.connect(noiseFilter);

      // Fade in the bed
      bedGain.gain.rampTo(0.6, 3);
    } else if (ambient === "rain") {
      // === Rain: filtered white noise with high-pass + shimmer ===
      noise = new Tone.Noise("white").start();
      noiseGain = new Tone.Gain(0).connect(bedGain);
      gains.push(noiseGain);

      // High-pass filter for the "hiss" of rain
      noiseFilter = new Tone.Filter({
        type: "highpass",
        frequency: 1000,
        Q: 0.5,
      }).connect(noiseGain);
      noise.connect(noiseFilter);

      // Add a low rumble for thunder-like depth
      const rumbleGain = new Tone.Gain(0.04).connect(bedGain);
      gains.push(rumbleGain);
      const rumble = new Tone.Oscillator({
        frequency: 50,
        type: "sine",
        volume: -20,
      }).connect(rumbleGain);
      rumble.start();
      oscillators.push(rumble);

      // Slow LFO on rumble for distant thunder feel
      const rumbleLfo = new Tone.LFO({
        frequency: 0.03,
        min: 0.01,
        max: 0.06,
      }).connect(rumbleGain.gain);
      rumbleLfo.start();
      lfos.push(rumbleLfo);

      // Fade in
      noiseGain.gain.rampTo(0.12, 3);
      bedGain.gain.rampTo(0.7, 3);
    } else if (ambient === "ocean") {
      // === Ocean waves: pink noise with slow amplitude LFO (waves swelling) ===
      noise = new Tone.Noise("pink").start();
      noiseGain = new Tone.Gain(0).connect(bedGain);
      gains.push(noiseGain);

      // Lowpass for the "wash" of waves
      noiseFilter = new Tone.Filter({
        type: "lowpass",
        frequency: 800,
        Q: 0.4,
      }).connect(noiseGain);
      noise.connect(noiseFilter);

      // Wave LFO — slow swelling (every ~7 seconds a wave)
      const waveLfo = new Tone.LFO({
        frequency: 0.14,
        min: 0.03,
        max: 0.18,
        type: "sine",
      }).connect(noiseGain.gain);
      waveLfo.start();
      lfos.push(waveLfo);

      // Second wave layer at different rate for natural variation
      const waveLfo2 = new Tone.LFO({
        frequency: 0.09,
        min: 0.02,
        max: 0.10,
        type: "sine",
      }).connect(noiseGain.gain);
      waveLfo2.start();
      lfos.push(waveLfo2);

      // Fade in
      noiseGain.gain.rampTo(0.1, 3);
      bedGain.gain.rampTo(0.8, 3);
    } else if (ambient === "wind") {
      // === Wind: brown noise with modulated bandpass ===
      noise = new Tone.Noise("brown").start();
      noiseGain = new Tone.Gain(0).connect(bedGain);
      gains.push(noiseGain);

      // Bandpass filter that sweeps — creates the "whoosh" of wind
      noiseFilter = new Tone.Filter({
        type: "bandpass",
        frequency: 500,
        Q: 0.8,
      }).connect(noiseGain);
      noise.connect(noiseFilter);

      // Sweep the filter frequency for wind variation
      const windLfo = new Tone.LFO({
        frequency: 0.12,
        min: 300,
        max: 1200,
        type: "sine",
      }).connect(noiseFilter.frequency);
      windLfo.start();
      lfos.push(windLfo);

      // Amplitude variation
      const ampLfo = new Tone.LFO({
        frequency: 0.07,
        min: 0.04,
        max: 0.12,
        type: "sine",
      }).connect(noiseGain.gain);
      ampLfo.start();
      lfos.push(ampLfo);

      // Fade in
      noiseGain.gain.rampTo(0.08, 3);
      bedGain.gain.rampTo(0.8, 3);
    } else if (ambient === "birds") {
      // === Bird Songs: gentle, pleasant birdsong with soft tonal whistles ===
      // Pink noise base for garden ambience
      noise = new Tone.Noise("pink").start();
      noiseGain = new Tone.Gain(0).connect(bedGain);
      gains.push(noiseGain);
      noiseFilter = new Tone.Filter({
        type: "lowpass",
        frequency: 500,
        Q: 0.3,
      }).connect(noiseGain);
      noise.connect(noiseFilter);

      // Bird whistles — warm triangle waves at musical frequencies
      // Using slow sine envelopes for gentle, natural-sounding chirps (NOT square waves)
      const birds = [
        { baseFreq: 1320, chirpRate: 0.3, pitchVar: 80, gain: 0.012 },  // E6 — soft whistle
        { baseFreq: 1760, chirpRate: 0.25, pitchVar: 100, gain: 0.010 }, // A6 — higher whistle
        { baseFreq: 880, chirpRate: 0.4, pitchVar: 60, gain: 0.014 },   // A5 — lower coo
      ];

      for (const bird of birds) {
        const birdGain = new Tone.Gain(0).connect(bedGain);
        gains.push(birdGain);

        const osc = new Tone.Oscillator({
          frequency: bird.baseFreq,
          type: "triangle", // warmer than sine, gentler than square
          volume: -16,
        }).connect(birdGain);
        osc.start();
        oscillators.push(osc);

        // Gentle amplitude envelope — slow sine wave, NOT square
        // This creates a soft "coo" quality instead of harsh chirping
        const ampLfo = new Tone.LFO({
          frequency: bird.chirpRate,
          min: 0,
          max: bird.gain,
          type: "sine", // sine = smooth fade in/out, no clicks
        }).connect(birdGain.gain);
        ampLfo.start();
        lfos.push(ampLfo);

        // Gentle pitch slide — bird slides between two notes
        const pitchLfo = new Tone.LFO({
          frequency: bird.chirpRate * 0.5,
          min: bird.baseFreq - bird.pitchVar,
          max: bird.baseFreq + bird.pitchVar,
          type: "sine",
        }).connect(osc.frequency);
        pitchLfo.start();
        lfos.push(pitchLfo);

        // Long pause envelope — bird sings in short bursts with gaps
        // Very slow sine so the bird is quiet most of the time, sings occasionally
        const pauseLfo = new Tone.LFO({
          frequency: 0.04 + Math.random() * 0.03, // ~every 20-30 seconds a burst
          min: 0,
          max: bird.gain,
          type: "sine",
        }).connect(birdGain.gain);
        pauseLfo.start();
        lfos.push(pauseLfo);
      }

      noiseGain.gain.rampTo(0.03, 3);
      bedGain.gain.rampTo(0.6, 3);
    } else if (ambient === "river") {
      // === River: continuous, smooth flowing water — NO amplitude modulation ===
      // The key fix: keep the noise CONSTANT (no LFO on gain) to avoid "steam train" pulsing.
      // Only the filter frequency slowly shifts to create natural variation.

      // Main water body: pink noise through lowpass — constant, smooth flow
      noise = new Tone.Noise("pink").start();
      noiseGain = new Tone.Gain(0).connect(bedGain);
      gains.push(noiseGain);

      // Lowpass filter — gives the "deep water" sound
      noiseFilter = new Tone.Filter({
        type: "lowpass",
        frequency: 900,
        Q: 0.4,
      }).connect(noiseGain);
      noise.connect(noiseFilter);

      // Very slow filter frequency drift — creates natural variation in the water sound
      // WITHOUT any amplitude changes (which caused the steam-train effect)
      const driftLfo = new Tone.LFO({
        frequency: 0.02, // extremely slow — 50 second cycle
        min: 700,
        max: 1200,
        type: "sine",
      }).connect(noiseFilter.frequency);
      driftLfo.start();
      lfos.push(driftLfo);

      // Second layer: higher-frequency "shallows" — white noise through highpass
      // This adds the brighter "rushing" quality of water over stones
      const shallowsNoise = new Tone.Noise("white").start();
      const shallowsGain = new Tone.Gain(0).connect(bedGain);
      gains.push(shallowsGain);
      const shallowsFilter = new Tone.Filter({
        type: "highpass",
        frequency: 2500,
        Q: 0.3,
      }).connect(shallowsGain);
      shallowsNoise.connect(shallowsFilter);

      // Very slow drift on shallows filter too
      const shallowsDrift = new Tone.LFO({
        frequency: 0.015,
        min: 2000,
        max: 3500,
        type: "sine",
      }).connect(shallowsFilter.frequency);
      shallowsDrift.start();
      lfos.push(shallowsDrift);

      // Deep bass rumble — the "weight" of the river
      const rumbleGain = new Tone.Gain(0.025).connect(bedGain);
      gains.push(rumbleGain);
      const rumble = new Tone.Oscillator({
        frequency: 55,
        type: "sine",
        volume: -16,
      }).connect(rumbleGain);
      rumble.start();
      oscillators.push(rumble);

      // Set CONSTANT gains (no LFO modulation on amplitude = no pulsing)
      noiseGain.gain.rampTo(0.1, 3);     // constant water body
      shallowsGain.gain.rampTo(0.02, 3); // constant shallows
      bedGain.gain.rampTo(0.8, 3);       // constant bed level
    } else if (ambient === "stream") {
      // === Stream/brook: white noise with high-pass + bubbly modulation ===
      noise = new Tone.Noise("white").start();
      noiseGain = new Tone.Gain(0).connect(bedGain);
      gains.push(noiseGain);

      // Highpass for the "bubble" quality
      noiseFilter = new Tone.Filter({
        type: "highpass",
        frequency: 2000,
        Q: 0.5,
      }).connect(noiseGain);
      noise.connect(noiseFilter);

      // Bubbly modulation — fast LFO on gain
      const bubbleLfo = new Tone.LFO({
        frequency: 4,
        min: 0.03,
        max: 0.08,
        type: "sine",
      }).connect(noiseGain.gain);
      bubbleLfo.start();
      lfos.push(bubbleLfo);

      // Second bubble layer
      const bubbleLfo2 = new Tone.LFO({
        frequency: 6.5,
        min: 0.02,
        max: 0.06,
        type: "sine",
      }).connect(noiseGain.gain);
      bubbleLfo2.start();
      lfos.push(bubbleLfo2);

      // Low water rumble
      const waterGain = new Tone.Gain(0.03).connect(bedGain);
      gains.push(waterGain);
      const water = new Tone.Oscillator({
        frequency: 80,
        type: "sine",
        volume: -18,
      }).connect(waterGain);
      water.start();
      oscillators.push(water);

      // Fade in
      bedGain.gain.rampTo(0.7, 3);
    }

    return { noise, noiseFilter, noiseGain, oscillators, gains, lfos };
  }

  const start = React.useCallback(
    async (opts: StartOptions) => {
      // Stop any existing session
      stop();

      // Resume audio context (non-blocking)
      try {
        const ctx = Tone.getContext();
        if (ctx.state !== "running") {
          ctx.resume().catch(() => {});
        }
      } catch {}

      const fadeIn = 3.0; // 3-second ultra-smooth fade in

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

      // === AMBIENT BED ===
      const bed = createAmbientBed(opts.ambient, masterGain);
      allOscillators.push(...bed.oscillators);
      allGains.push(...bed.gains);
      allLfos.push(...bed.lfos);

      // === FREQUENCY TONE ===
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

        // Smooth fade in — ramp from 0 to target
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

        // Smooth fade in
        leftGain.gain.rampTo(0.16, fadeIn);
        rightGain.gain.rampTo(0.16, fadeIn);
      } else {
        // pad
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

      // Store session
      sessionRef.current = {
        oscillators: allOscillators,
        gains: allGains,
        lfos: allLfos,
        noise: bed.noise,
        noiseFilter: bed.noiseFilter,
        noiseGain: bed.noiseGain,
        filter,
        merger,
        masterGain,
        bedGain: null,
        timer: null,
        startTime: Date.now(),
      };

      // Smooth master fade in — the KEY anti-click measure
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

  // Cleanup on unmount only
  React.useEffect(() => {
    return () => {
      stopRef.current();
    };
  }, []);

  return { start, stop };
}

export type { AmbientBed };
