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
 * Breathing pacer — uses a self-contained timer that doesn't depend on
 * parent re-renders. The phase advances via an internal interval that
 * survives parent state updates.
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
  const [countdown, setCountdown] = React.useState(0);

  const config = PATTERNS[pattern];
  const phases = config.phases;
  const phase = phases[phaseIdx];

  // Use a ref to track the current phase index so the interval doesn't stale-close
  const phaseIdxRef = React.useRef(0);
  const patternRef = React.useRef(pattern);

  // Update refs in an effect (not during render)
  React.useEffect(() => {
    phaseIdxRef.current = phaseIdx;
    patternRef.current = pattern;
  }, [phaseIdx, pattern]);

  // Self-contained timer — runs independently of parent re-renders
  React.useEffect(() => {
    if (!active) {
      setPhaseIdx(0);
      setCountdown(0);
      return;
    }

    // Initialize countdown for the first phase
    const currentPhases = PATTERNS[patternRef.current].phases;
    setCountdown(currentPhases[0].sec);

    const interval = setInterval(() => {
      const currentIdx = phaseIdxRef.current;
      const currentPhases = PATTERNS[patternRef.current].phases;
      const currentPhase = currentPhases[currentIdx];

      setCountdown((prev) => {
        if (prev > 1) {
          return prev - 1;
        }
        // Phase is done — advance to next phase
        const nextIdx = (currentIdx + 1) % currentPhases.length;
        setPhaseIdx(nextIdx);
        return currentPhases[nextIdx].sec;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [active]); // ONLY depend on `active` — not on phaseIdx or pattern changes

  // Reset when pattern changes
  const handlePatternChange = React.useCallback((p: BreathPattern) => {
    setPattern(p);
    setPhaseIdx(0);
    setCountdown(PATTERNS[p].phases[0].sec);
  }, []);

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
        {/* breathing orb — key changes on phaseIdx to force clean animation restart */}
        <motion.div
          key={`orb-${phaseIdx}`}
          className="rounded-full"
          initial={{ scale: isExpand ? 0.4 : 1, opacity: isExpand ? 0.35 : 1 }}
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
        {/* phase label + countdown */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.div
            key={`label-${phaseIdx}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-[16px] font-light text-ink"
          >
            {phase.name}
          </motion.div>
          <div className="text-[20px] font-light text-ink tabular-nums mt-0.5">
            {countdown}
          </div>
        </div>
      </div>

      {/* Pattern selector */}
      <div className="flex gap-1.5">
        {(Object.keys(PATTERNS) as BreathPattern[]).map((p) => (
          <button
            key={p}
            onClick={() => handlePatternChange(p)}
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
