"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Target, AudioLines, ChevronRight } from "lucide-react";
import { GoldButton, GhostButton, StarField } from "@/components/lumina/primitives";
import { useAppStore } from "@/lib/store";

const ONBOARDING_KEY = "lumina.onboarded";

/** Returns true if the user has seen onboarding (checks localStorage). */
export function hasOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return true;
  }
}

const SLIDES = [
  {
    icon: Sparkles,
    eyebrow: "Tarot",
    title: "Ask, and the cards answer",
    body: "Pose any question. Lumina shuffles the full 78-card Rider–Waite deck and an AI voice interprets what the symbols mirror back — Yes/No guidance or a deep multi-card spread.",
    accent: "#C5A87C",
    glyph: "✦",
  },
  {
    icon: Target,
    eyebrow: "Manifestation",
    title: "Name it. Confirm it daily.",
    body: "Set what you desire. Lumina auto-tunes a frequency to your intention and nudges you, every day at your chosen time, to confirm the statement aloud. Streaks compound the signal.",
    accent: "#B5CD7E",
    glyph: "◉",
  },
  {
    icon: AudioLines,
    eyebrow: "Frequencies",
    title: "Tune the body, free the mind",
    body: "Pure tones, binaural beats, and ambient pads — 888 Hz for abundance, 528 Hz for healing, 963 Hz for unity. A breathing pacer guides you into resonance.",
    accent: "#9E8AC9",
    glyph: "〰",
  },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [idx, setIdx] = React.useState(0);
  const setTab = useAppStore((s) => s.setTab);
  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;
  const Icon = slide.icon;

  function next() {
    if (isLast) {
      try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch {}
      onDone();
    } else {
      setIdx((i) => i + 1);
    }
  }

  function skip() {
    try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch {}
    onDone();
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Aurora backdrop */}
      <div className="absolute inset-0 lum-aurora" />
      <StarField count={40} />

      <div className="relative z-10 flex-1 flex flex-col px-6 pt-16 pb-8">
        {/* Skip */}
        <button
          onClick={skip}
          className="absolute top-12 right-6 text-[12px] text-ink-muted hover:text-ink tracking-wide"
        >
          Skip
        </button>

        {/* Slide content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
              className="flex flex-col items-center"
            >
              {/* Glowing icon orb */}
              <motion.div
                className="relative w-24 h-24 rounded-full flex items-center justify-center mb-8"
                style={{
                  background: `radial-gradient(circle at 50% 40%, ${slide.accent}33 0%, ${slide.accent}08 50%, transparent 75%)`,
                  border: `1.5px solid ${slide.accent}44`,
                  boxShadow: `0 0 50px ${slide.accent}44, inset 0 0 24px ${slide.accent}22`,
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                {/* pulsing rings */}
                {[0, 1].map((r) => (
                  <motion.span
                    key={r}
                    className="absolute inset-0 rounded-full"
                    style={{ border: `1px solid ${slide.accent}40` }}
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, delay: r * 0.8, ease: "easeOut" }}
                  />
                ))}
                <Icon className="w-9 h-9" style={{ color: slide.accent }} strokeWidth={1.5} />
              </motion.div>

              <div className="text-[11px] uppercase tracking-[0.24em] font-medium mb-3" style={{ color: slide.accent }}>
                {slide.eyebrow}
              </div>
              <h1 className="text-[26px] font-light leading-[32px] tracking-[-0.025em] text-ink max-w-[300px]">
                {slide.title}
              </h1>
              <p className="mt-4 text-[14px] leading-[22px] text-ink-muted max-w-[320px]">
                {slide.body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots + CTA */}
        <div className="space-y-6">
          {/* Dots */}
          <div className="flex items-center justify-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className="transition-all"
                aria-label={`Slide ${i + 1}`}
              >
                <span
                  className="block rounded-full transition-all"
                  style={{
                    width: i === idx ? 24 : 6,
                    height: 6,
                    background: i === idx ? slide.accent : "rgba(255,255,255,0.2)",
                  }}
                />
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <GoldButton onClick={next} className="w-full">
              {isLast ? (
                <>
                  Begin <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Continue <ChevronRight className="w-4 h-4" />
                </>
              )}
            </GoldButton>
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
