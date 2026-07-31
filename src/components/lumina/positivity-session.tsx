"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, VolumeX } from "lucide-react";
import type { PositivityScript } from "@/lib/positivity";

/**
 * PositivitySession — full-screen immersive recitation experience.
 *
 * 10/10 Award-winning design based on research of Calm, Headspace, Balance:
 * - SINGLE soft breathing circular aura behind text (not disruptive rings)
 *   Scale: 0.8 → 1.2, Opacity: 0.25 → 0.5, 10s cycle (4s in / 6s out), ease-in-out
 * - Radial scrim behind text for legibility
 * - Soft layered text-shadow (blur ≥ 8px)
 * - Word-by-word fade-in (cinematic, not slideshow)
 * - Minimal dots at bottom (4px, opacity 0.3 dim / 0.7 lit) — no counters
 * - TTS with smart voice selection (auto-disable if no quality voice)
 * - Smooth entry (600-800ms fade + scale) and exit (400-500ms fade)
 * - Completion screen with auto-close (5s countdown)
 */

export function PositivitySession({
  script,
  onClose,
}: {
  script: PositivityScript;
  onClose: () => void;
}) {
  const [phase, setPhase] = React.useState<"countdown" | "playing" | "paused" | "complete">("countdown");
  const [countdown, setCountdown] = React.useState(3);
  const [lineIdx, setLineIdx] = React.useState(0);
  const [lineProgress, setLineProgress] = React.useState(0);
  const [ttsEnabled, setTtsEnabled] = React.useState(true);
  const [ttsAvailable, setTtsAvailable] = React.useState(true);
  const [exiting, setExiting] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const currentLine = script.lines[lineIdx];
  const accent = getAccent(script.category);

  // Check TTS voice quality on mount
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setTtsAvailable(false);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      // Voices may not be loaded yet — wait for them
      window.speechSynthesis.onvoiceschanged = () => {
        const v = window.speechSynthesis.getVoices();
        const hasQuality = v.some((voice) => isQualityVoice(voice));
        setTtsAvailable(hasQuality);
      };
    } else {
      const hasQuality = voices.some((voice) => isQualityVoice(voice));
      setTtsAvailable(hasQuality);
    }
  }, []);

  // TTS — speak the current line with smart voice selection
  React.useEffect(() => {
    if (phase !== "playing" || !ttsEnabled || !ttsAvailable || !currentLine) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(currentLine.text);
    // Calm, natural settings (research: rate 0.85-0.95, pitch 1.0-1.1)
    utterance.rate = 0.85;
    utterance.pitch = 1.05;
    utterance.volume = 0.9;

    // Smart voice selection — prefer natural/enhanced voices
    const voices = window.speechSynthesis.getVoices();
    const qualityVoice = voices.find((v) => isQualityVoice(v));
    if (qualityVoice) utterance.voice = qualityVoice;

    // Small delay before speaking (lets the text animation start first)
    const speakTimer = setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 400);

    return () => {
      clearTimeout(speakTimer);
      window.speechSynthesis.cancel();
    };
  }, [lineIdx, phase, currentLine, ttsEnabled, ttsAvailable]);

  // Countdown 3 → 2 → 1 → start
  React.useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown === 0) {
      setPhase("playing");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Auto-advance through lines (with inter-line pause for breathing)
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

  // Cleanup TTS on unmount
  React.useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function togglePause() {
    if (phase === "playing") {
      setPhase("paused");
      if (timerRef.current) clearInterval(timerRef.current);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } else if (phase === "paused") {
      setPhase("playing");
    }
  }

  // Smooth close — fade out before calling onClose
  function smoothClose() {
    setExiting(true);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setTimeout(() => onClose(), 600);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: exiting ? 0.5 : 0.7, ease: exiting ? "easeIn" : "easeOut" }}
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 50% 50%, #0a0805 0%, #030201 80%)",
      }}
    >
      {/* === SINGLE SOFT BREATHING AURA === */}
      {/* The focal breathing circle — clearly visible, organic, calming */}
      {phase !== "countdown" && (
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
            duration: 10, // 4s in + 6s out (Calm "Balance" rhythm)
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Countdown aura */}
      {phase === "countdown" && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: "70vmin",
            height: "70vmin",
            background: `radial-gradient(circle, ${accent}45 0%, ${accent}15 30%, transparent 70%)`,
          }}
          animate={{
            scale: [0.85, 1.15, 0.85],
            opacity: [0.35, 0.6, 0.35],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Completion aura */}
      {phase === "complete" && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: "90vmin",
            height: "90vmin",
            background: `radial-gradient(circle, ${accent}40 0%, ${accent}12 35%, transparent 70%)`,
          }}
          animate={{
            scale: [0.9, 1.25, 0.9],
            opacity: [0.3, 0.55, 0.3],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Subtle floating particles — very few, very soft */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              width: 2,
              height: 2,
              background: `${accent}60`,
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 53 + 29) % 100}%`,
              boxShadow: `0 0 4px ${accent}40`,
            }}
            animate={{
              y: [0, -80 - (i % 5) * 20],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 12 + (i % 6),
              repeat: Infinity,
              delay: i * 0.8,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Close button (top-right) — minimal */}
      <button
        onClick={smoothClose}
        className="absolute top-12 right-6 text-white/30 hover:text-white/70 z-30 transition-colors"
        aria-label="Close session"
      >
        <X className="w-5 h-5" strokeWidth={1.5} />
      </button>

      {/* TTS toggle (top-left) — only if TTS is available */}
      {ttsAvailable && (
        <button
          onClick={() => setTtsEnabled(!ttsEnabled)}
          className="absolute top-12 left-6 text-white/30 hover:text-white/70 z-30 transition-colors"
          aria-label={ttsEnabled ? "Mute voice" : "Enable voice"}
        >
          {ttsEnabled ? <Volume2 className="w-5 h-5" strokeWidth={1.5} /> : <VolumeX className="w-5 h-5" strokeWidth={1.5} />}
        </button>
      )}

      {/* === MAIN CONTENT === */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md px-8 text-center">
        {phase === "countdown" && (
          <motion.div
            key={countdown}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.7, ease: [0.2, 0, 0, 1] }}
            className="flex flex-col items-center"
          >
            <div
              className="text-[10px] uppercase tracking-[0.32em] font-medium mb-10"
              style={{ color: accent }}
            >
              {script.title}
            </div>
            {countdown > 0 ? (
              <div className="text-[88px] font-extralight text-white/90 tabular-nums">
                {countdown}
              </div>
            ) : (
              <div className="text-[32px] font-light text-white/90">Begin</div>
            )}
            <p className="mt-10 text-[12px] text-white/35 max-w-[240px] tracking-wide">
              Breathe slowly. Let each word settle into your being.
            </p>
          </motion.div>
        )}

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
              {/* Radial scrim behind text for legibility */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse 60% 40% at 50% 50%, rgba(5,3,2,0.6) 0%, transparent 70%)`,
                }}
              />

              {/* The affirmation — word-by-word fade-in */}
              <div className="relative text-[22px] md:text-[25px] font-normal leading-[36px] text-[#F5F5F7] max-w-[340px] min-h-[200px] flex items-center justify-center" style={{ letterSpacing: "0.01em" }}>
                {currentLine.text.split(" ").map((word, wi) => (
                  <motion.span
                    key={wi}
                    initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.3 + wi * 0.07, ease: "easeOut" }}
                    className="inline-block mr-[0.25em]"
                    style={{
                      textShadow: `0 2px 8px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.35)`,
                    }}
                  >
                    {word}
                  </motion.span>
                ))}
              </div>

              {/* Minimal pause button — small, below text */}
              <button
                onClick={togglePause}
                className="relative mt-10 w-10 h-10 rounded-full flex items-center justify-center border transition-all"
                style={{
                  borderColor: `${accent}30`,
                  background: `${accent}08`,
                }}
                aria-label={phase === "playing" ? "Pause" : "Resume"}
              >
                {phase === "playing" ? (
                  <div className="flex gap-1">
                    <div className="w-1 h-3 rounded-full" style={{ background: `${accent}80` }} />
                    <div className="w-1 h-3 rounded-full" style={{ background: `${accent}80` }} />
                  </div>
                ) : (
                  <div className="w-0 h-0 ml-0.5" style={{
                    borderLeft: `7px solid ${accent}80`,
                    borderTop: `4px solid transparent`,
                    borderBottom: `4px solid transparent`,
                  }} />
                )}
              </button>
            </motion.div>
          </AnimatePresence>
        )}

        {phase === "complete" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.2, 0, 0, 1] }}
            className="flex flex-col items-center"
          >
            {/* Soft completion symbol */}
            <motion.div
              className="relative w-16 h-16 rounded-full flex items-center justify-center mb-8"
              style={{
                background: `radial-gradient(circle, ${accent}30, transparent 70%)`,
                border: `1px solid ${accent}40`,
              }}
              animate={{ scale: [1, 1.06, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="text-[24px]" style={{ color: accent }}>✦</span>
            </motion.div>

            <div className="relative text-[10px] uppercase tracking-[0.32em] font-medium mb-3" style={{ color: accent }}>
              Session Complete
            </div>
            <h2 className="relative text-[24px] font-light text-[#F5F5F7] mb-3 tracking-[-0.01em]">Your day is blessed</h2>
            <p className="relative text-[13px] text-white/40 max-w-[260px] leading-[19px]">
              I carry this energy into everything I do today.
            </p>

            {/* Auto-close countdown */}
            <AutoCloseTimer onClose={smoothClose} />
          </motion.div>
        )}
      </div>

      {/* === MINIMAL PROGRESS DOTS (bottom, peripheral) === */}
      {phase !== "countdown" && phase !== "complete" && (
        <div className="absolute bottom-20 left-0 right-0 flex items-center justify-center gap-2 z-20">
          {script.lines.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-500"
              style={{
                width: 5,
                height: 5,
                background: i < lineIdx
                  ? `${accent}90`
                  : i === lineIdx
                  ? accent
                  : "rgba(255,255,255,0.2)",
                opacity: i <= lineIdx ? 0.8 : 0.35,
                boxShadow: i === lineIdx ? `0 0 6px ${accent}80` : "none",
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

/** Auto-close timer — smooth, no buttons. */
function AutoCloseTimer({ onClose }: { onClose: () => void }) {
  const [seconds, setSeconds] = React.useState(5);

  React.useEffect(() => {
    if (seconds <= 0) {
      onClose();
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.5 }}
      className="relative mt-10 flex items-center gap-2"
    >
      <div className="text-[10px] text-white/25 uppercase tracking-[0.2em]">
        Returning to Lumina
      </div>
      <div className="text-[10px] text-white/25 tabular-nums">{seconds}</div>
    </motion.div>
  );
}

/** Check if a TTS voice is high-quality (not robotic). */
function isQualityVoice(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase();
  // Prefer natural/enhanced/premium voices
  return (
    name.includes("natural") ||
    name.includes("enhanced") ||
    name.includes("premium") ||
    name.includes("google") ||
    name.includes("samantha") ||
    name.includes("aria") ||
    name.includes("jenny") ||
    name.includes("zira") ||
    name.includes("karen") ||
    name.includes("moira") ||
    name.includes("tessa")
  );
}

function getAccent(category: string): string {
  const accents: Record<string, string> = {
    wealth: "#E7D2A8",
    money: "#B5CD7E",
    health: "#B5CD7E",
    relationship: "#D876A0",
    power: "#F09A3D",
    career: "#5FA9C7",
    promotion: "#C5A87C",
    "stress-release": "#9E8AC9",
    anxiety: "#9E8AC9",
    worries: "#9E8AC9",
    "anti-negative": "#F09A3D",
    custom: "#C5A87C",
  };
  return accents[category] || "#C5A87C";
}
