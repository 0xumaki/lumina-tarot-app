"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause } from "lucide-react";
import type { PositivityScript } from "@/lib/positivity";

/**
 * PositivitySession — full-screen immersive recitation experience.
 *
 * Features:
 * - Animated subtitle display (one line at a time, timed per line)
 * - Breathing background (radial gradient that pulses with each line)
 * - Progress ring showing time remaining
 * - Play/pause controls
 * - Gentle ambient glow in the category's accent color
 * - Auto-advance through lines, with a 3-2-1 countdown before start
 * - Completion screen with a closing breath
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
  const [lineProgress, setLineProgress] = React.useState(0); // 0-1 within current line
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const currentLine = script.lines[lineIdx];
  const accent = getAccent(script.category);

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

  // Auto-advance through lines
  React.useEffect(() => {
    if (phase !== "playing") return;

    const duration = currentLine.durationSec * 1000;
    const interval = 50; // update every 50ms
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

  function togglePause() {
    if (phase === "playing") {
      setPhase("paused");
      if (timerRef.current) clearInterval(timerRef.current);
    } else if (phase === "paused") {
      setPhase("playing");
    }
  }

  function restart() {
    setLineIdx(0);
    setLineProgress(0);
    setPhase("countdown");
    setCountdown(3);
  }

  // Total progress
  const totalProgress = (lineIdx + lineProgress) / script.lines.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#050403" }}
    >
      {/* Breathing background — radial glow in accent color */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${accent}15 0%, ${accent}08 30%, transparent 70%)`,
        }}
        animate={{
          scale: phase === "playing" ? [1, 1.08, 1] : 1,
          opacity: phase === "playing" ? [0.7, 1, 0.7] : 0.5,
        }}
        transition={{
          duration: currentLine?.durationSec || 8,
          repeat: phase === "playing" ? Infinity : 0,
          ease: "easeInOut",
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              width: 1.5 + (i % 3),
              height: 1.5 + (i % 3),
              background: `${accent}40`,
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              boxShadow: `0 0 4px ${accent}30`,
            }}
            animate={{
              y: [0, -40 - (i % 5) * 10],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 8 + (i % 6),
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-12 right-6 text-white/50 hover:text-white z-30 transition-colors"
        aria-label="Close session"
      >
        <X className="w-6 h-6" strokeWidth={1.5} />
      </button>

      {/* Progress bar — top of screen */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-white/5 z-20">
        <motion.div
          className="h-full"
          style={{
            background: `linear-gradient(90deg, ${accent}, ${accent}80)`,
            width: `${totalProgress * 100}%`,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md px-8 text-center">
        {phase === "countdown" && (
          <motion.div
            key={countdown}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <div
              className="text-[10px] uppercase tracking-[0.3em] font-medium mb-6"
              style={{ color: accent }}
            >
              {script.title}
            </div>
            {countdown > 0 ? (
              <div className="text-[80px] font-extralight text-white tabular-nums">
                {countdown}
              </div>
            ) : (
              <div className="text-[28px] font-light text-white">Begin</div>
            )}
            <p className="mt-6 text-[12px] text-white/50 max-w-[240px]">
              Breathe slowly. Read each line aloud or in your mind.
            </p>
          </motion.div>
        )}

        {(phase === "playing" || phase === "paused") && currentLine && (
          <AnimatePresence mode="wait">
            <motion.div
              key={lineIdx}
              initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
              transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }}
              className="flex flex-col items-center"
            >
              {/* Line counter */}
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/30 font-medium mb-8 tabular-nums">
                {String(lineIdx + 1).padStart(2, "0")} / {String(script.lines.length).padStart(2, "0")}
              </div>

              {/* The affirmation text */}
              <p className="text-[22px] md:text-[24px] font-light leading-[34px] text-white max-w-[340px] min-h-[140px] flex items-center justify-center drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
                {currentLine.text}
              </p>

              {/* Line progress dots */}
              <div className="flex items-center gap-1.5 mt-10">
                {script.lines.map((_, i) => (
                  <div
                    key={i}
                    className="h-1 rounded-full transition-all duration-300"
                    style={{
                      width: i === lineIdx ? 20 : 4,
                      background: i < lineIdx
                        ? `${accent}80`
                        : i === lineIdx
                        ? accent
                        : "rgba(255,255,255,0.1)",
                    }}
                  />
                ))}
              </div>

              {/* Pause/play button */}
              <button
                onClick={togglePause}
                className="mt-10 w-12 h-12 rounded-full flex items-center justify-center border transition-all"
                style={{
                  borderColor: `${accent}40`,
                  background: `${accent}10`,
                }}
                aria-label={phase === "playing" ? "Pause" : "Resume"}
              >
                {phase === "playing" ? (
                  <Pause className="w-5 h-5" style={{ color: accent }} />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" style={{ color: accent }} />
                )}
              </button>
            </motion.div>
          </AnimatePresence>
        )}

        {phase === "complete" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            {/* Completion glow */}
            <motion.div
              className="w-24 h-24 rounded-full flex items-center justify-center mb-8 relative"
              style={{
                background: `radial-gradient(circle, ${accent}30, transparent 70%)`,
                border: `1.5px solid ${accent}50`,
                boxShadow: `0 0 60px ${accent}40`,
              }}
              animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="text-[32px]" style={{ color: accent }}>✦</span>
            </motion.div>

            <div className="text-[10px] uppercase tracking-[0.3em] font-medium mb-3" style={{ color: accent }}>
              Session Complete
            </div>
            <h2 className="text-[24px] font-light text-white mb-2">Your day is blessed</h2>
            <p className="text-[13px] text-white/60 max-w-[280px] mb-8 leading-[19px]">
              You've set your intention. Carry this energy into everything you do today.
            </p>

            <div className="flex flex-col gap-2 w-full max-w-[260px]">
              <button
                onClick={restart}
                className="w-full rounded-full py-3 text-[13px] font-medium text-black active:scale-[0.98] transition-all"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
              >
                ✦ Begin Again
              </button>
              <button
                onClick={onClose}
                className="w-full rounded-full py-3 text-[13px] text-white/70 hover:text-white border border-white/10 hover:border-white/20 transition-all"
              >
                Return to Lumina
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
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
