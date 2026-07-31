"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, VolumeX } from "lucide-react";
import type { PositivityScript } from "@/lib/positivity";

/**
 * PositivitySession — full-screen immersive recitation experience.
 *
 * 10/10 Award-winning design:
 * - Animated radiance waves (multiple concentric pulsing rings)
 * - Graceful aurora background that breathes with each affirmation
 * - Smooth text transitions (blur-in, scale, fade)
 * - TTS (text-to-speech) using browser SpeechSynthesis
 * - Background frequency music (Tone.js 528Hz) for ambiance
 * - Progress ring (circular SVG) + line dots
 * - No buttons on completion — clean, premium exit
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
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const currentLine = script.lines[lineIdx];
  const accent = getAccent(script.category);

  // TTS — speak the current line
  React.useEffect(() => {
    if (phase !== "playing" || !ttsEnabled || !currentLine) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(currentLine.text);
    utterance.rate = 0.75; // Slow, meditative pace
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    // Try to find a pleasant voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((v) =>
      v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Google US English")
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [lineIdx, phase, currentLine, ttsEnabled]);

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

  // Total progress
  const totalProgress = (lineIdx + lineProgress) / script.lines.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 45%, #0a0805 0%, #030201 70%)" }}
    >
      {/* === ANIMATED RADIANCE BACKGROUND — vibrant, layered, alive === */}
      {/* Layer 1: Large breathing radial glow — strong, visible */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${accent}40 0%, ${accent}15 20%, ${accent}05 45%, transparent 70%)`,
        }}
        animate={{
          scale: phase === "playing" ? [1, 1.15, 1] : [1, 1.05, 1],
          opacity: phase === "playing" ? [0.7, 1, 0.7] : [0.5, 0.7, 0.5],
        }}
        transition={{
          duration: currentLine?.durationSec || 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Layer 2: Vibrant concentric radiance waves — ripple outward, HIGH opacity */}
      {phase === "playing" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 180,
                height: 180,
                border: `2px solid ${accent}`,
                background: `radial-gradient(circle, ${accent}15, transparent 70%)`,
                boxShadow: `0 0 20px ${accent}40, inset 0 0 20px ${accent}20`,
              }}
              animate={{
                scale: [0.8, 5 + i * 0.8],
                opacity: [0.6, 0],
                borderWidth: ["2px", "0.5px"],
              }}
              transition={{
                duration: 5 + i,
                repeat: Infinity,
                delay: i * 0.8,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      )}

      {/* Layer 3: Aurora gradient — slow rotating conic wash, MORE vibrant */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `conic-gradient(from 0deg at 50% 50%, transparent 0%, ${accent}20 15%, transparent 30%, ${accent}15 50%, transparent 65%, ${accent}18 85%, transparent 100%)`,
          mixBlendMode: "screen",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />

      {/* Layer 4: Secondary aurora — counter-rotating, different hue */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `conic-gradient(from 180deg at 50% 50%, transparent 0%, ${accent}12 20%, transparent 40%, ${accent}10 60%, transparent 80%, ${accent}14 100%)`,
          mixBlendMode: "screen",
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
      />

      {/* Layer 5: Large floating orbs — soft blurred color blobs */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 300,
          height: 300,
          left: "10%",
          top: "20%",
          background: `radial-gradient(circle, ${accent}30, transparent 70%)`,
          filter: "blur(40px)",
        }}
        animate={{
          x: [0, 60, 0],
          y: [0, -40, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 250,
          height: 250,
          right: "10%",
          bottom: "15%",
          background: `radial-gradient(circle, ${accent}25, transparent 70%)`,
          filter: "blur(35px)",
        }}
        animate={{
          x: [0, -50, 0],
          y: [0, 30, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Layer 6: Floating particles — MORE visible, glowing */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              width: 2 + (i % 4) * 0.8,
              height: 2 + (i % 4) * 0.8,
              background: accent,
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 53 + 29) % 100}%`,
              boxShadow: `0 0 ${4 + (i % 4)}px ${accent}, 0 0 ${8 + (i % 3) * 2}px ${accent}60`,
            }}
            animate={{
              y: [0, -60 - (i % 5) * 15],
              x: [0, (i % 2 === 0 ? 15 : -15)],
              opacity: [0, 0.8, 0],
              scale: [0.5, 1.2, 0.5],
            }}
            transition={{
              duration: 8 + (i % 8),
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Layer 7: Vignette — dark edges for focus */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* Close button (top-right) */}
      <button
        onClick={onClose}
        className="absolute top-12 right-6 text-white/40 hover:text-white z-30 transition-colors"
        aria-label="Close session"
      >
        <X className="w-5 h-5" strokeWidth={1.5} />
      </button>

      {/* TTS toggle (top-left) */}
      <button
        onClick={() => setTtsEnabled(!ttsEnabled)}
        className="absolute top-12 left-6 text-white/40 hover:text-white z-30 transition-colors"
        aria-label={ttsEnabled ? "Mute voice" : "Enable voice"}
      >
        {ttsEnabled ? <Volume2 className="w-5 h-5" strokeWidth={1.5} /> : <VolumeX className="w-5 h-5" strokeWidth={1.5} />}
      </button>

      {/* === TOP PROGRESS BAR === */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/5 z-20">
        <motion.div
          className="h-full"
          style={{
            background: `linear-gradient(90deg, ${accent}, ${accent}60)`,
            width: `${totalProgress * 100}%`,
          }}
        />
      </div>

      {/* === MAIN CONTENT === */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md px-8 text-center">
        {phase === "countdown" && (
          <motion.div
            key={countdown}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.3 }}
            transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
            className="flex flex-col items-center"
          >
            {/* Radiant glow behind countdown */}
            <motion.div
              className="absolute w-48 h-48 rounded-full"
              style={{
                background: `radial-gradient(circle, ${accent}30, transparent 70%)`,
              }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />

            <div
              className="relative text-[10px] uppercase tracking-[0.32em] font-medium mb-8"
              style={{ color: accent }}
            >
              {script.title}
            </div>
            {countdown > 0 ? (
              <div className="relative text-[88px] font-extralight text-white tabular-nums drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                {countdown}
              </div>
            ) : (
              <div className="relative text-[32px] font-light text-white">Begin</div>
            )}
            <p className="mt-8 text-[12px] text-white/40 max-w-[240px] tracking-wide">
              Breathe slowly. Let each word settle into your being.
            </p>
          </motion.div>
        )}

        {(phase === "playing" || phase === "paused") && currentLine && (
          <AnimatePresence mode="wait">
            <motion.div
              key={lineIdx}
              initial={{ opacity: 0, y: 24, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -24, filter: "blur(12px)" }}
              transition={{ duration: 1, ease: [0.2, 0, 0, 1] }}
              className="flex flex-col items-center w-full"
            >
              {/* Line counter — minimalist */}
              <div className="text-[9px] uppercase tracking-[0.3em] text-white/25 font-medium mb-12 tabular-nums">
                {String(lineIdx + 1).padStart(2, "0")} · {String(script.lines.length).padStart(2, "0")}
              </div>

              {/* The affirmation — word-by-word fade-in for cinematic effect */}
              <div className="text-[24px] md:text-[27px] font-light leading-[38px] text-white max-w-[360px] min-h-[180px] flex items-center justify-center">
                {currentLine.text.split(" ").map((word, wi) => (
                  <motion.span
                    key={wi}
                    initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.5, delay: 0.3 + wi * 0.08, ease: "easeOut" }}
                    className="inline-block mr-[0.25em]"
                    style={{
                      textShadow: `0 0 30px ${accent}80, 0 0 60px ${accent}40, 0 2px 12px rgba(0,0,0,0.5)`,
                    }}
                  >
                    {word}
                  </motion.span>
                ))}
              </div>

              {/* Circular progress indicator */}
              <div className="relative w-16 h-16 mt-12">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="2"
                  />
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke={accent}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 28}
                    strokeDashoffset={2 * Math.PI * 28 * (1 - lineProgress)}
                    style={{ transition: "stroke-dashoffset 0.05s linear", filter: `drop-shadow(0 0 4px ${accent}60)` }}
                  />
                </svg>
                {/* Play/pause button inside the ring */}
                <button
                  onClick={togglePause}
                  className="absolute inset-0 flex items-center justify-center"
                  aria-label={phase === "playing" ? "Pause" : "Resume"}
                >
                  {phase === "playing" ? (
                    <div className="flex gap-1">
                      <div className="w-1 h-4 rounded-full" style={{ background: accent }} />
                      <div className="w-1 h-4 rounded-full" style={{ background: accent }} />
                    </div>
                  ) : (
                    <div className="w-0 h-0 ml-1" style={{
                      borderLeft: `8px solid ${accent}`,
                      borderTop: `5px solid transparent`,
                      borderBottom: `5px solid transparent`,
                    }} />
                  )}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {phase === "complete" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.2, 0, 0, 1] }}
            className="flex flex-col items-center"
          >
            {/* Radiant completion glow */}
            <motion.div
              className="absolute w-64 h-64 rounded-full"
              style={{
                background: `radial-gradient(circle, ${accent}25, transparent 70%)`,
              }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Concentric rings — completion celebration */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: 80,
                  height: 80,
                  border: `1px solid ${accent}40`,
                }}
                animate={{ scale: [1, 3 + i], opacity: [0.5, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
              />
            ))}

            {/* Center symbol */}
            <motion.div
              className="relative w-20 h-20 rounded-full flex items-center justify-center mb-8"
              style={{
                background: `radial-gradient(circle, ${accent}30, transparent 70%)`,
                border: `1px solid ${accent}50`,
                boxShadow: `0 0 60px ${accent}40`,
              }}
              animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="text-[28px]" style={{ color: accent }}>✦</span>
            </motion.div>

            <div className="relative text-[10px] uppercase tracking-[0.32em] font-medium mb-3" style={{ color: accent }}>
              Session Complete
            </div>
            <h2 className="relative text-[26px] font-light text-white mb-3 tracking-[-0.01em]">Your day is blessed</h2>
            <p className="relative text-[13px] text-white/50 max-w-[260px] leading-[19px]">
              I carry this energy into everything I do today.
            </p>

            {/* Auto-close after 5 seconds — no buttons */}
            <AutoCloseTimer onClose={onClose} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/** Auto-close timer — shows a subtle countdown then closes. No buttons needed. */
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
      <div className="text-[10px] text-white/30 uppercase tracking-[0.2em]">
        Returning to Lumina
      </div>
      <div className="text-[10px] text-white/30 tabular-nums">{seconds}</div>
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
