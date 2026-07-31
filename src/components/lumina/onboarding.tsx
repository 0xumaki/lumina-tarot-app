"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Target, AudioLines, ChevronRight, Heart, Coins, Lightbulb } from "lucide-react";
import { GoldButton, GhostButton, StarField } from "@/components/lumina/primitives";
import { useAppStore } from "@/lib/store";

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

const INTENTIONS = [
  { id: "clarity", label: "Clarity", desc: "I seek direction and understanding", icon: Lightbulb, accent: "#C5A87C" },
  { id: "healing", label: "Healing", desc: "I seek peace and restoration", icon: Heart, accent: "#B5CD7E" },
  { id: "abundance", label: "Abundance", desc: "I seek prosperity and flow", icon: Coins, accent: "#E7D2A8" },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [idx, setIdx] = React.useState(0);
  const [intention, setIntention] = React.useState<string | null>(null);
  const setTab = useAppStore((s) => s.setTab);

  // idx 0-2 = slides, idx 3 = intention picker
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
      setIdx((i) => i + 1);
    }
  }

  function skip() {
    try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch {}
    onDone();
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="absolute inset-0 lum-aurora" />
      <StarField count={40} />

      <div className="relative z-10 flex-1 flex flex-col px-6 pt-16 pb-8">
        <button
          onClick={skip}
          className="absolute top-12 right-6 text-[12px] text-ink-muted hover:text-ink tracking-wide"
        >
          Skip
        </button>

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait">
            {slide && (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
                className="flex flex-col items-center"
              >
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
            )}

            {/* Intention picker — slide 4 */}
            {isIntentionStep && (
              <motion.div
                key="intention"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
                className="flex flex-col items-center w-full max-w-[340px]"
              >
                <motion.div
                  className="relative w-20 h-20 rounded-full flex items-center justify-center mb-6"
                  style={{
                    background: "radial-gradient(circle at 50% 40%, rgba(197,168,124,0.25), transparent 70%)",
                    border: "1.5px solid rgba(197,168,124,0.35)",
                    boxShadow: "0 0 40px rgba(197,168,124,0.2)",
                  }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="w-8 h-8 text-gold" strokeWidth={1.5} />
                </motion.div>

                <div className="text-[11px] uppercase tracking-[0.24em] text-gold/80 font-medium mb-3">
                  One last thing
                </div>
                <h1 className="text-[24px] font-light leading-[30px] tracking-[-0.025em] text-ink">
                  What brought you here today?
                </h1>
                <p className="mt-3 text-[13px] leading-[19px] text-ink-muted max-w-[280px]">
                  We'll shape your first card-of-day around your intention.
                </p>

                {/* Intention choices */}
                <div className="mt-6 w-full space-y-2.5">
                  {INTENTIONS.map((opt) => {
                    const isSelected = intention === opt.id;
                    const OptIcon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setIntention(opt.id)}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                          isSelected
                            ? "border-gold/50 bg-gold/[0.10] shadow-[0_0_20px_-4px_rgba(197,168,124,0.2)]"
                            : "border-white/6 bg-white/[0.015] hover:border-white/15 hover:bg-white/[0.03]"
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background: isSelected ? `${opt.accent}25` : `${opt.accent}15`,
                            border: `1px solid ${opt.accent}${isSelected ? "55" : "30"}`,
                          }}
                        >
                          <OptIcon className="w-4 h-4" style={{ color: opt.accent }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-[14px] font-medium ${isSelected ? "text-gold" : "text-ink"}`}>
                            {opt.label}
                          </div>
                          <div className="text-[11px] text-ink-muted mt-0.5">{opt.desc}</div>
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-5 h-5 rounded-full bg-gradient-to-br from-[#E7D2A8] to-[#C5A87C] flex items-center justify-center shrink-0"
                          >
                            <ChevronRight className="w-3 h-3 text-black" strokeWidth={3} />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress dots + CTA */}
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-2">
            {[0, 1, 2, 3].map((i) => (
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
                    background: i === idx
                      ? (isIntentionStep ? "#C5A87C" : SLIDES[idx]?.accent || "#C5A87C")
                      : "rgba(255,255,255,0.2)",
                  }}
                />
              </button>
            ))}
          </div>

          <div className="space-y-2">
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
