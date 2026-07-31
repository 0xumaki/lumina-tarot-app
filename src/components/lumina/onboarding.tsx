"use client";

import * as React from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Sparkles, Target, AudioLines, ChevronRight, Heart, Coins, Lightbulb } from "lucide-react";
import { GoldButton, GhostButton } from "@/components/lumina/primitives";

const ONBOARDING_KEY = "lumina.onboarded";
const INTENTION_KEY = "lumina.intention";

/** Returns true if the user has seen onboarding (checks localStorage). */
export function hasOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return true;
  }
}

/** Returns the user's onboarding intention, or null. */
export function getOnboardingIntention(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(INTENTION_KEY);
  } catch {
    return null;
  }
}

const SLIDES = [
  {
    icon: Sparkles,
    eyebrow: "Tarot",
    title: "Ask, and the\ncards answer",
    body: "Pose any question. Lumina shuffles the full 78-card Rider–Waite deck and an AI voice interprets what the symbols mirror back — Yes/No guidance or a deep multi-card spread.",
    accent: "#C5A87C",
    bg: "/images/onboarding/slide-1.jpg",
  },
  {
    icon: Target,
    eyebrow: "Manifestation",
    title: "Name it.\nConfirm it daily.",
    body: "Set what you desire. Lumina auto-tunes a frequency to your intention and nudges you, every day at your chosen time, to confirm the statement aloud. Streaks compound the signal.",
    accent: "#B5CD7E",
    bg: "/images/onboarding/slide-2.jpg",
  },
  {
    icon: AudioLines,
    eyebrow: "Frequencies",
    title: "Tune the body,\nfree the mind",
    body: "Pure tones, binaural beats, and ambient pads — 888 Hz for abundance, 528 Hz for healing, 963 Hz for unity. A breathing pacer guides you into resonance.",
    accent: "#9E8AC9",
    bg: "/images/onboarding/slide-3.jpg",
  },
];

const INTENTIONS = [
  { id: "clarity", label: "Clarity", desc: "I seek direction and understanding", icon: Lightbulb, accent: "#C5A87C" },
  { id: "healing", label: "Healing", desc: "I seek peace and restoration", icon: Heart, accent: "#B5CD7E" },
  { id: "abundance", label: "Abundance", desc: "I seek prosperity and flow", icon: Coins, accent: "#E7D2A8" },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [idx, setIdx] = React.useState(0);
  const [intention, setIntention] = React.useState<string | null>(null);
  const [direction, setDirection] = React.useState(1);

  const slide = idx < 3 ? SLIDES[idx] : null;
  const isIntentionStep = idx === 3;
  const isLast = idx === 3;
  const Icon = slide?.icon;

  function next() {
    if (isLast) {
      try {
        localStorage.setItem(ONBOARDING_KEY, "1");
        if (intention) localStorage.setItem(INTENTION_KEY, intention);
      } catch {}
      onDone();
    } else {
      setDirection(1);
      setIdx((i) => i + 1);
    }
  }

  function skip() {
    try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch {}
    onDone();
  }

  function goTo(i: number) {
    setDirection(i > idx ? 1 : -1);
    setIdx(i);
  }

  // Variants for slide transitions
  const slideVariants = {
    enter: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? 40 : -40,
      scale: 0.98,
    }),
    center: {
      opacity: 1,
      x: 0,
      scale: 1,
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? -40 : 40,
      scale: 0.98,
    }),
  };

  const bgVariants = {
    enter: { opacity: 0, scale: 1.08 },
    center: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.02 },
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden">
      {/* Background image layer with Ken Burns zoom + crossfade */}
      <AnimatePresence mode="popLayout" custom={direction}>
        <motion.div
          key={`bg-${idx}`}
          custom={direction}
          variants={bgVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ opacity: { duration: 0.9, ease: "easeInOut" }, scale: { duration: 6, ease: "easeOut" } }}
          className="absolute inset-0"
        >
          <img
            src={isIntentionStep ? "/images/onboarding/slide-4.jpg" : slide?.bg}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.38) saturate(0.9) contrast(1.05)" }}
          />
          {/* Cinematic gradient overlay — bottom-heavy for text legibility */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 35%, rgba(0,0,0,0.7) 75%, rgba(0,0,0,0.95) 100%)",
            }}
          />
          {/* Subtle vignette */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)",
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Floating particles for atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              width: 1.5 + Math.random() * 2,
              height: 1.5 + Math.random() * 2,
              background: "rgba(231, 210, 168, 0.4)",
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              boxShadow: "0 0 4px rgba(231, 210, 168, 0.3)",
            }}
            animate={{
              y: [0, -30 - Math.random() * 40],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 8 + Math.random() * 8,
              repeat: Infinity,
              delay: Math.random() * 8,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex-1 flex flex-col px-6 pt-16 pb-8">
        {/* Skip button */}
        <button
          onClick={skip}
          className="absolute top-12 right-6 text-[12px] text-white/60 hover:text-white tracking-[0.15em] uppercase z-20 transition-colors"
        >
          Skip
        </button>

        {/* Slide counter (top-left, cinematic) */}
        <div className="absolute top-12 left-6 flex items-center gap-2 z-20">
          <span className="text-[11px] text-white/40 tracking-[0.2em] uppercase font-light">
            {isIntentionStep ? "04" : `0${idx + 1}`}
          </span>
          <span className="text-[11px] text-white/20">/</span>
          <span className="text-[11px] text-white/20 tracking-[0.2em] font-light">04</span>
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait" custom={direction}>
            {slide && Icon && (
              <motion.div
                key={idx}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
                className="flex flex-col items-center"
              >
                {/* Icon with pulsing aura rings */}
                <motion.div
                  className="relative w-20 h-20 rounded-full flex items-center justify-center mb-8"
                  style={{
                    background: `radial-gradient(circle at 50% 40%, ${slide.accent}40 0%, ${slide.accent}10 50%, transparent 75%)`,
                    border: `1px solid ${slide.accent}50`,
                    boxShadow: `0 0 60px ${slide.accent}33, inset 0 0 20px ${slide.accent}22`,
                  }}
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                >
                  {[0, 1, 2].map((r) => (
                    <motion.span
                      key={r}
                      className="absolute inset-0 rounded-full"
                      style={{ border: `1px solid ${slide.accent}30` }}
                      animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                      transition={{ duration: 3, repeat: Infinity, delay: r * 1, ease: "easeOut" }}
                    />
                  ))}
                  <Icon className="w-7 h-7" style={{ color: slide.accent }} strokeWidth={1.5} />
                </motion.div>

                {/* Eyebrow */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-[10px] uppercase tracking-[0.32em] font-medium mb-4"
                  style={{ color: slide.accent }}
                >
                  {slide.eyebrow}
                </motion.div>

                {/* Title — two-line, large, light weight */}
                <h1 className="text-[28px] font-light leading-[34px] tracking-[-0.02em] text-white max-w-[300px] whitespace-pre-line drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                  {slide.title}
                </h1>

                {/* Body text */}
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="mt-5 text-[13.5px] leading-[21px] text-white/75 max-w-[310px] drop-shadow-md"
                >
                  {slide.body}
                </motion.p>
              </motion.div>
            )}

            {/* Intention picker — slide 4 */}
            {isIntentionStep && (
              <motion.div
                key="intention"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
                className="flex flex-col items-center w-full max-w-[340px]"
              >
                <motion.div
                  className="relative w-16 h-16 rounded-full flex items-center justify-center mb-6"
                  style={{
                    background: "radial-gradient(circle at 50% 40%, rgba(197,168,124,0.3), transparent 70%)",
                    border: "1px solid rgba(197,168,124,0.4)",
                    boxShadow: "0 0 40px rgba(197,168,124,0.2)",
                  }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="w-6 h-6 text-gold" strokeWidth={1.5} />
                </motion.div>

                <div className="text-[10px] uppercase tracking-[0.32em] text-gold/80 font-medium mb-3">
                  One last thing
                </div>
                <h1 className="text-[24px] font-light leading-[30px] tracking-[-0.02em] text-white drop-shadow-lg whitespace-pre-line">
                  What brought you\nhere today?
                </h1>
                <p className="mt-3 text-[12.5px] leading-[18px] text-white/70 max-w-[270px]">
                  We'll shape your first card-of-day around your intention.
                </p>

                {/* Intention choices — glass morphism cards */}
                <div className="mt-6 w-full space-y-2">
                  {INTENTIONS.map((opt, i) => {
                    const isSelected = intention === opt.id;
                    const OptIcon = opt.icon;
                    return (
                      <motion.button
                        key={opt.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.08 }}
                        onClick={() => setIntention(opt.id)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left backdrop-blur-md ${
                          isSelected
                            ? "border-gold/50 bg-gold/[0.12] shadow-[0_0_24px_-4px_rgba(197,168,124,0.3)]"
                            : "border-white/8 bg-black/30 hover:border-white/20 hover:bg-black/40"
                        }`}
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background: isSelected ? `${opt.accent}30` : `${opt.accent}15`,
                            border: `1px solid ${opt.accent}${isSelected ? "60" : "30"}`,
                          }}
                        >
                          <OptIcon className="w-4 h-4" style={{ color: opt.accent }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-[13.5px] font-medium ${isSelected ? "text-gold" : "text-white"}`}>
                            {opt.label}
                          </div>
                          <div className="text-[10.5px] text-white/55 mt-0.5">{opt.desc}</div>
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="w-5 h-5 rounded-full bg-gradient-to-br from-[#E7D2A8] to-[#C5A87C] flex items-center justify-center shrink-0"
                          >
                            <ChevronRight className="w-3 h-3 text-black" strokeWidth={3} />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress + CTA */}
        <div className="space-y-5 relative z-10">
          {/* Progress bar — cinematic line style */}
          <div className="flex items-center justify-center gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="transition-all"
                aria-label={`Slide ${i + 1}`}
              >
                <div
                  className="h-[3px] rounded-full transition-all duration-500 overflow-hidden"
                  style={{
                    width: i === idx ? 32 : 12,
                    background: "rgba(255,255,255,0.15)",
                  }}
                >
                  {i === idx && (
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: isIntentionStep
                          ? "linear-gradient(90deg, #C5A87C, #E7D2A8)"
                          : `linear-gradient(90deg, ${SLIDES[idx]?.accent || "#C5A87C"}, ${SLIDES[idx]?.accent || "#E7D2A8"}99)`,
                      }}
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  )}
                  {i < idx && (
                    <div
                      className="h-full rounded-full"
                      style={{
                        background: i < 3 ? `${SLIDES[i]?.accent}60` : "rgba(197,168,124,0.4)",
                      }}
                    />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="space-y-2.5">
            {isIntentionStep ? (
              <GoldButton onClick={next} disabled={!intention} className="w-full">
                Begin <ChevronRight className="w-4 h-4" />
              </GoldButton>
            ) : (
              <GoldButton onClick={next} className="w-full">
                Continue <ChevronRight className="w-4 h-4" />
              </GoldButton>
            )}
            {idx === 0 && (
              <GhostButton onClick={skip} className="w-full">
                I know the way
              </GhostButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
