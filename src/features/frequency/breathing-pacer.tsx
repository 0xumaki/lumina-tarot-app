"use client";

import * as React from "react";
import { motion } from "framer-motion";

type BreathPattern = "4-7-8" | "box" | "coherent";

const PATTERNS: Record<BreathPattern, { phases: { name: string; sec: number }[]; label: string; desc: string }> = {
  "4-7-8": {
    phases: [
      { name: "Inhale", sec: 4 },
      { name: "Hold", sec: 7 },
      { name: "Exhale", sec: 8 },
    ],
    label: "4-7-8 Relaxing Breath",
    desc: "Inhale 4s · Hold 7s · Exhale 8s — deeply calming",
  },
  box: {
    phases: [
      { name: "Inhale", sec: 4 },
      { name: "Hold", sec: 4 },
      { name: "Exhale", sec: 4 },
      { name: "Hold", sec: 4 },
    ],
    label: "Box Breathing",
    desc: "Equal 4-4-4-4 — focus & equilibrium",
  },
  coherent: {
    phases: [
      { name: "Inhale", sec: 5 },
      { name: "Exhale", sec: 5 },
    ],
    label: "Coherent 5.5",
    desc: "5s in · 5s out — heart-rate variability",
  },
};

/**
 * Breathing pacer — a visual guide that expands/contracts with the breath phases.
 * Shown during active frequency sessions to deepen the meditative state.
 */
export function BreathingPacer({
  active,
  color,
  pattern: patternProp = "4-7-8",
}: {
  active: boolean;
  color: string;
  pattern?: BreathPattern;
}) {
  const [pattern, setPattern] = React.useState<BreathPattern>(patternProp);
  const [phaseIdx, setPhaseIdx] = React.useState(0);
  const config = PATTERNS[pattern];
  const phase = config.phases[phaseIdx];

  // Advance phases only when active
  React.useEffect(() => {
    if (!active) {
      setPhaseIdx(0);
      return;
    }
    const t = setTimeout(() => {
      setPhaseIdx((i) => (i + 1) % config.phases.length);
    }, phase.sec * 1000);
    return () => clearTimeout(t);
  }, [active, phaseIdx, phase.sec, config.phases.length]);

  if (!active) return null;

  const isExpand = phase.name === "Inhale";
  const isHold = phase.name === "Hold";
  const scale = isHold ? 0.9 : isExpand ? 1 : 0.4;
  const orbOpacity = isHold ? 0.75 : isExpand ? 1 : 0.35;
  const glowSize = isExpand ? 40 : isHold ? 24 : 12;
  const dur = phase.sec;

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="relative w-[160px] h-[160px] flex items-center justify-center">
        {/* outer ring guide */}
        <div
          className="absolute rounded-full border"
          style={{ width: "100%", height: "100%", borderColor: `${color}22`, borderWidth: 1 }}
        />
        {/* breathing orb */}
        <motion.div
          className="rounded-full"
          animate={{ scale, opacity: orbOpacity }}
          transition={{ duration: dur, ease: "easeInOut" }}
          style={{
            width: "85%",
            height: "85%",
            background: `radial-gradient(circle at 50% 40%, ${color}${isExpand ? "66" : isHold ? "44" : "22"} 0%, ${color}11 50%, transparent 80%)`,
            border: `1.5px solid ${color}${isExpand ? "88" : "55"}`,
            boxShadow: `0 0 ${glowSize}px ${color}${isExpand ? "55" : "33"}, inset 0 0 ${glowSize / 2}px ${color}${isExpand ? "33" : "22"}`,
          }}
        />
        {/* phase label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.div
            key={phase.name + phaseIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-[16px] font-light text-ink"
          >
            {phase.name}
          </motion.div>
          <motion.div
            key={"sec" + phaseIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] text-ink-muted tabular-nums mt-0.5"
          >
            {phase.sec}s
          </motion.div>
        </div>
      </div>

      {/* Pattern selector */}
      <div className="flex gap-1.5">
        {(Object.keys(PATTERNS) as BreathPattern[]).map((p) => (
          <button
            key={p}
            onClick={() => { setPattern(p); setPhaseIdx(0); }}
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium tracking-wide transition-colors ${
              pattern === p
                ? "bg-gold/15 text-gold border border-gold/30"
                : "bg-white/[0.03] text-ink-muted border border-white/8 hover:text-ink"
            }`}
          >
            {PATTERNS[p].label.split(" ")[0]}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-ink-muted text-center max-w-[240px] leading-[13px]">
        {config.desc}
      </p>
    </div>
  );
}
