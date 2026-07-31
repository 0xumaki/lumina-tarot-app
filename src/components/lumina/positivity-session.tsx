"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, Music } from "lucide-react";
import type { PositivityScript } from "@/lib/positivity";

/**
 * PositivitySession — full-screen immersive recitation experience.
 *
 * Audio:
 * - Smart frequency: uses the category's Solfeggio frequency (888Hz wealth, 528Hz health, etc.)
 * - 10+ ambient beds: randomly selected per session (rain, ocean, forest, wind, etc.)
 * - Volume matches Tones section (audible, not background-only)
 * - Graceful fade-out on session end (3s exponential ramp)
 */

// 12 ambient beds — randomly selected per session
const AMBIENT_BEDS = [
  { id: "rain", label: "Gentle Rain", filter: { type: "lowpass", freq: 800 } },
  { id: "ocean", label: "Ocean Waves", filter: { type: "lowpass", freq: 400 } },
  { id: "forest", label: "Forest Birds", filter: { type: "bandpass", freq: 2000 } },
  { id: "wind", label: "Soft Wind", filter: { type: "lowpass", freq: 600 } },
  { id: "stream", label: "Bubbling Stream", filter: { type: "bandpass", freq: 1500 } },
  { id: "river", label: "Flowing River", filter: { type: "lowpass", freq: 500 } },
  { id: "bowl", label: "Singing Bowl", filter: { type: "lowpass", freq: 1200 } },
  { id: "chimes", label: "Wind Chimes", filter: { type: "highpass", freq: 1000 } },
  { id: "drone", label: "Deep Drone", filter: { type: "lowpass", freq: 300 } },
  { id: "ambient", label: "Warm Ambient", filter: { type: "lowpass", freq: 1000 } },
  { id: "night", label: "Night Crickets", filter: { type: "bandpass", freq: 3000 } },
  { id: "ethereal", label: "Ethereal Pad", filter: { type: "lowpass", freq: 2000 } },
];

export function PositivitySession({
  script,
  frequencyHz,
  frequencyName,
  onClose,
}: {
  script: PositivityScript;
  frequencyHz?: number;
  frequencyName?: string;
  onClose: () => void;
}) {
  const [phase, setPhase] = React.useState<"countdown" | "playing" | "paused" | "complete">("countdown");
  const [countdown, setCountdown] = React.useState(5);
  const [lineIdx, setLineIdx] = React.useState(0);
  const [lineProgress, setLineProgress] = React.useState(0);
  const [exiting, setExiting] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = React.useRef<{ stop: (fadeSec?: number) => void } | null>(null);

  const currentLine = script.lines[lineIdx];
  const accent = getAccent(script.category);
  const freqHz = frequencyHz || 528;

  // Randomly select an ambient bed for this session
  const ambientBed = React.useMemo(() => {
    return AMBIENT_BEDS[Math.floor(Math.random() * AMBIENT_BEDS.length)];
  }, []);

  // Start ambient music when session begins
  React.useEffect(() => {
    if (phase !== "playing" || audioRef.current) return;

    let stopped = false;
    let nodes: any[] = [];
    let masterGain: any = null;
    let audioElements: HTMLAudioElement[] = [];

    // Start Tone.js audio context (requires user gesture — the click that started the session)
    import("tone").then(async (Tone) => {
      if (stopped) return;

      try {
        // CRITICAL: Start the audio context (must be triggered by user gesture)
        await Tone.start();

        // Master gain — AUDIBLE volume (0.4 = 40% — clearly hearable)
        masterGain = new Tone.Gain(0.4).toDestination();

        // Frequency oscillators (the Solfeggio frequency)
        const osc1 = new Tone.Oscillator({
          frequency: freqHz,
          type: "sine",
          volume: 0, // 0 dB = full volume
        }).connect(masterGain);
        osc1.start();

        const osc2 = new Tone.Oscillator({
          frequency: freqHz * 1.5,
          type: "sine",
          volume: -6,
        }).connect(masterGain);
        osc2.start();

        // Slow LFO for breathing volume modulation
        const lfo = new Tone.LFO({
          frequency: 0.1,
          min: -6,
          max: 0,
          type: "sine",
        }).start();
        lfo.connect(osc1.volume);

        nodes = [osc1, osc2, lfo];

        // Play REAL ambient soundtrack (WAV file — actual recorded/synthesized audio, not generated at runtime)
        const bedAudio = new Audio(`/audio/${ambientBed.id}.wav`);
        bedAudio.loop = true;
        bedAudio.volume = 0.6; // Clearly audible
        bedAudio.crossOrigin = "anonymous";
        await bedAudio.play().catch((e) => {
          console.warn("Ambient bed audio failed:", e);
        });
        audioElements.push(bedAudio);

        // Fade in
        masterGain.gain.rampTo(0.4, 2);

        audioRef.current = {
          stop: (fadeSec = 3) => {
            if (masterGain) {
              masterGain.gain.rampTo(0, fadeSec);
            }
            // Fade out ambient audio
            audioElements.forEach((a) => {
              try {
                const fadeInterval = setInterval(() => {
                  a.volume = Math.max(0, a.volume - 0.05);
                  if (a.volume <= 0) {
                    clearInterval(fadeInterval);
                    a.pause();
                  }
                }, (fadeSec * 1000) / 20);
              } catch {}
            });
            setTimeout(() => {
              nodes.forEach((n) => {
                try { n.stop?.(); n.dispose?.(); } catch {}
              });
              audioElements.forEach((a) => { try { a.pause(); a.src = ""; } catch {} });
              nodes = [];
              audioElements = [];
            }, (fadeSec + 0.5) * 1000);
          },
        };
      } catch (e) {
        console.error("Audio setup failed:", e);
      }
    }).catch(() => {});

    return () => {
      stopped = true;
      if (audioRef.current) {
        audioRef.current.stop(1);
        audioRef.current = null;
      }
    };
  }, [phase, freqHz, ambientBed]);

  // Countdown 5 → 1
  React.useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown === 0) {
      setPhase("playing");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Auto-advance through lines
  React.useEffect(() => {
    if (phase !== "playing") return;

    const duration = currentLine.durationSec * 1000;
    const interval = 50;
    let elapsed = 0;

    timerRef.current = setInterval(() => {
      elapsed += interval;
      const progress = Math.min(1, elapsed / duration);
      setLineProgress(progress);

      if (progress >= 1) {
        if (lineIdx < script.lines.length - 1) {
          setLineIdx((i) => i + 1);
          setLineProgress(0);
          elapsed = 0;
        } else {
          setPhase("complete");
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, lineIdx, currentLine, script.lines.length]);

  // Graceful audio fade-out when session completes
  React.useEffect(() => {
    if (phase === "complete" && audioRef.current) {
      audioRef.current.stop(3); // 3-second graceful fade
    }
  }, [phase]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.stop(1);
      }
    };
  }, []);

  function togglePause() {
    if (phase === "playing") {
      setPhase("paused");
      if (timerRef.current) clearInterval(timerRef.current);
    } else if (phase === "paused") {
      setPhase("playing");
    }
  }

  function smoothClose() {
    setExiting(true);
    if (audioRef.current) audioRef.current.stop(1.5);
    setTimeout(() => onClose(), 700);
  }

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: exiting ? 0.5 : 0.7, ease: exiting ? "easeIn" : "easeOut" }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 50% 50%, #0a0805 0%, #030201 80%)",
      }}
    >
      {/* === SINGLE SOFT BREATHING AURA === */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: "80vmin",
          height: "80vmin",
          background: `radial-gradient(circle, ${accent}50 0%, ${accent}25 25%, ${accent}08 50%, transparent 75%)`,
        }}
        animate={{
          scale: [0.85, 1.15, 0.85],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Subtle floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              width: 2, height: 2,
              background: `${accent}60`,
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 53 + 29) % 100}%`,
              boxShadow: `0 0 4px ${accent}40`,
            }}
            animate={{ y: [0, -80 - (i % 5) * 20], opacity: [0, 0.5, 0] }}
            transition={{ duration: 12 + (i % 6), repeat: Infinity, delay: i * 0.8, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Close button */}
      <button
        onClick={smoothClose}
        className="absolute top-6 right-4 sm:top-12 sm:right-6 text-white/30 hover:text-white/70 z-30 transition-colors"
        aria-label="Close session"
      >
        <X className="w-5 h-5" strokeWidth={1.5} />
      </button>

      {/* Frequency info badge (top-left) */}
      <div className="absolute top-6 left-4 sm:top-12 sm:left-6 z-30 flex items-center gap-1.5">
        <Music className="w-3.5 h-3.5 text-white/30" strokeWidth={1.5} />
        <span className="text-[9px] text-white/30 tabular-nums tracking-wide">{freqHz}Hz · {ambientBed.label}</span>
      </div>

      {/* === MAIN CONTENT === */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md px-5 sm:px-8 text-center min-h-[100dvh] py-20">

        {/* COUNTDOWN */}
        {phase === "countdown" && (
          <div className="flex flex-col items-center">
            <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.28em] sm:tracking-[0.32em] font-medium mb-8 sm:mb-10" style={{ color: accent }}>
              {script.title}
            </div>
            <div className="relative h-[100px] sm:h-[120px] flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={countdown}
                  initial={{ opacity: 0, y: 40, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -40, scale: 1.2 }}
                  transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
                  className="text-[72px] sm:text-[88px] font-extralight text-white/90 tabular-nums leading-none"
                >
                  {countdown > 0 ? countdown : ""}
                </motion.div>
              </AnimatePresence>
            </div>
            <p className="mt-8 sm:mt-10 text-[11px] sm:text-[12px] text-white/35 max-w-[220px] sm:max-w-[240px] tracking-wide">
              Breathe slowly. Let each word settle into your being.
            </p>
          </div>
        )}

        {/* PLAYING / PAUSED */}
        {(phase === "playing" || phase === "paused") && currentLine && (
          <AnimatePresence mode="wait">
            <motion.div
              key={lineIdx}
              initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -16, filter: "blur(8px)" }}
              transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }}
              className="flex flex-col items-center w-full"
            >
              <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 40% at 50% 50%, rgba(5,3,2,0.6) 0%, transparent 70%)` }} />

              {/* Affirmation text — mobile responsive */}
              <div
                className="relative font-normal text-[#F5F5F7] flex items-center justify-center text-center w-full"
                style={{
                  fontSize: "clamp(18px, 5.5vw, 25px)",
                  lineHeight: "clamp(28px, 8vw, 38px)",
                  letterSpacing: "0.01em",
                  minHeight: "clamp(140px, 40vh, 200px)",
                  maxWidth: "clamp(280px, 90vw, 340px)",
                  flexWrap: "wrap",
                  alignContent: "center",
                }}
              >
                {currentLine.text.split(" ").map((word, wi) => (
                  <motion.span
                    key={wi}
                    initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.3 + wi * 0.07, ease: "easeOut" }}
                    className="inline-block mr-[0.25em]"
                    style={{ textShadow: `0 2px 8px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.35)` }}
                  >
                    {word}
                  </motion.span>
                ))}
              </div>

              {/* Pause button */}
              <button
                onClick={togglePause}
                className="relative mt-8 sm:mt-10 w-10 h-10 rounded-full flex items-center justify-center border transition-all shrink-0"
                style={{ borderColor: `${accent}30`, background: `${accent}08` }}
                aria-label={phase === "playing" ? "Pause" : "Resume"}
              >
                {phase === "playing" ? (
                  <Pause className="w-4 h-4" style={{ color: `${accent}80` }} strokeWidth={1.5} />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" style={{ color: `${accent}80` }} strokeWidth={1.5} />
                )}
              </button>
            </motion.div>
          </AnimatePresence>
        )}

        {/* COMPLETION */}
        {phase === "complete" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.2, 0, 0, 1] }}
            className="flex flex-col items-center"
          >
            <motion.div
              className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-6 sm:mb-8"
              style={{ background: `radial-gradient(circle, ${accent}30, transparent 70%)`, border: `1px solid ${accent}40` }}
              animate={{ scale: [1, 1.06, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="text-[20px] sm:text-[24px]" style={{ color: accent }}>✦</span>
            </motion.div>
            <div className="relative text-[9px] sm:text-[10px] uppercase tracking-[0.28em] sm:tracking-[0.32em] font-medium mb-3" style={{ color: accent }}>
              Session Complete
            </div>
            <h2 className="relative text-[20px] sm:text-[24px] font-light text-[#F5F5F7] mb-3 tracking-[-0.01em]">Your day is blessed</h2>
            <p className="relative text-[12px] sm:text-[13px] text-white/40 max-w-[240px] sm:max-w-[260px] leading-[18px] sm:leading-[19px]">
              I carry this energy into everything I do today.
            </p>
            <AutoCloseTimer onClose={smoothClose} />
          </motion.div>
        )}
      </div>

      {/* Progress counter */}
      {phase !== "countdown" && phase !== "complete" && (
        <div className="absolute bottom-8 sm:bottom-16 left-0 right-0 flex items-center justify-center z-20">
          <div className="text-[9px] text-white/20 tabular-nums tracking-wider">
            {String(lineIdx + 1).padStart(2, "0")} / {String(script.lines.length).padStart(2, "0")}
          </div>
        </div>
      )}
    </motion.div>,
    document.body
  );
}

function AutoCloseTimer({ onClose }: { onClose: () => void }) {
  const [seconds, setSeconds] = React.useState(5);
  React.useEffect(() => {
    if (seconds <= 0) { onClose(); return; }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, onClose]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="relative mt-8 sm:mt-10 flex items-center gap-2">
      <div className="text-[10px] text-white/25 uppercase tracking-[0.2em]">Returning to Lumina</div>
      <div className="text-[10px] text-white/25 tabular-nums">{seconds}</div>
    </motion.div>
  );
}

function getAccent(category: string): string {
  const accents: Record<string, string> = {
    wealth: "#E7D2A8", money: "#B5CD7E", health: "#B5CD7E",
    relationship: "#D876A0", power: "#F09A3D", career: "#5FA9C7",
    promotion: "#C5A87C", "stress-release": "#9E8AC9", anxiety: "#9E8AC9",
    worries: "#9E8AC9", "anti-negative": "#F09A3D", custom: "#C5A87C",
  };
  return accents[category] || "#C5A87C";
}
