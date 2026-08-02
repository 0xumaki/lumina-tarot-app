"use client";

import * as React from "react";
import { motion } from "framer-motion";

/**
 * Moon Phase Calculator + Display.
 * Shows the current lunar phase and suggests a frequency based on the phase.
 */

const MOON_PHASES = [
  { name: "New Moon", emoji: "🌑", desc: "Set intentions, plant seeds", suggestion: "clarity", color: "#7A8680" },
  { name: "Waxing Crescent", emoji: "🌒", desc: "Build momentum, take action", suggestion: "confidence", color: "#C5A87C" },
  { name: "First Quarter", emoji: "🌓", desc: "Push through obstacles", suggestion: "transformation", color: "#C5A87C" },
  { name: "Waxing Gibbous", emoji: "🌔", desc: "Refine and adjust", suggestion: "creativity", color: "#E7D2A8" },
  { name: "Full Moon", emoji: "🌕", desc: "Release what no longer serves", suggestion: "release", color: "#E8EBE9" },
  { name: "Waning Gibbous", emoji: "🌖", desc: "Share wisdom, express gratitude", suggestion: "love", color: "#B5CD7E" },
  { name: "Last Quarter", emoji: "🌗", desc: "Forgive, let go, release", suggestion: "peace", color: "#9E8AC9" },
  { name: "Waning Crescent", emoji: "🌘", desc: "Rest, reflect, restore", suggestion: "healing", color: "#7A8680" },
];

function getMoonPhase(date = new Date()): typeof MOON_PHASES[0] {
  // Calculate moon phase using the Conway algorithm
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let r = year % 100;
  r %= 19;
  if (r > 9) r -= 19;
  r = ((r * 11) % 30) + month + day;
  if (month < 3) r += 2;
  r -= year < 2000 ? 4 : 8.3;
  r = Math.floor(r + 0.5) % 30;
  const phase = r < 0 ? r + 30 : r;

  // Map phase (0-29.5) to 8 phases
  const phaseIndex = Math.floor((phase / 29.53) * 8) % 8;
  return MOON_PHASES[phaseIndex];
}

export function MoonPhase({ onSuggest }: { onSuggest?: (intention: string) => void }) {
  const phase = React.useMemo(() => getMoonPhase(), []);

  return (
    <div className="lum-glass rounded-2xl p-3.5 flex items-center gap-3">
      <motion.div
        className="text-[28px] leading-none shrink-0"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ filter: `drop-shadow(0 0 8px ${phase.color}44)` }}
      >
        {phase.emoji}
      </motion.div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-ink">{phase.name}</div>
        <div className="text-[11px] text-ink-muted mt-0.5">{phase.desc}</div>
      </div>
      {onSuggest && (
        <button
          onClick={() => onSuggest(phase.suggestion)}
          className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-medium border transition-colors"
          style={{
            borderColor: `${phase.color}44`,
            color: phase.color,
            background: `${phase.color}10`,
          }}
        >
          Tune →
        </button>
      )}
    </div>
  );
}
