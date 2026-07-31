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
  // Hold: keep the orb at the inhale's final scale (1) — it pauses, doesn't shrink
  const scale = isHold ? 1 : isExpand ? 1 : 0.35;
  const orbOpacity = isHold ? 1 : isExpand ? 1 : 0.3;
  const glowSize = isExpand ? 50 : isHold ? 50 : 15;
  const dur = phase.sec;
  // During Hold: instant transition (no animation — orb stays still)
  const transitionDur = isHold ? 0 : dur;

  return (
    <div
      className="relative rounded-3xl overflow-hidden p-[1.5px]"
      style={{
        background: `linear-gradient(135deg, ${color}44 0%, ${color}0a 50%, ${color}22 100%)`,
      }}
    >
      <div
        className="w-full rounded-[22px] relative overflow-hidden"
        style={{ background: "linear-gradient(165deg, #0d0b08 0%, #050403 100%)" }}
      >
          {/* Ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(60% 40% at 50% 50%, ${color}10 0%, transparent 70%)` }}
          />

          <div className="relative z-10 flex flex-col items-center gap-3 py-6 px-4">
            {/* Header */}
            <div className="flex items-center gap-2">
              <div
                className="w-1 h-1 rounded-full"
                style={{ background: color, boxShadow: `0 0 6px ${color}` }}
              />
              <span className="text-[10px] uppercase tracking-[0.24em] font-medium" style={{ color: `${color}cc` }}>
                Breath Guide
              </span>
            </div>

            {/* Orb container — 180px for a more premium presence */}
            <div className="relative w-[180px] h-[180px] flex items-center justify-center">
              {/* Outer guide ring with tick marks */}
              <svg className="absolute inset-0" width="180" height="180" viewBox="0 0 180 180">
                <circle cx="90" cy="90" r="88" fill="none" stroke={`${color}10`} strokeWidth="0.5" />
                <circle cx="90" cy="90" r="82" fill="none" stroke={`${color}08`} strokeWidth="0.5" strokeDasharray="1 5" />
              </svg>

              {/* Pulsing rings that emanate during inhale */}
              {isExpand && (
                <>
                  <motion.div
                    className="absolute rounded-full"
                    style={{ width: "70%", height: "70%", border: `1px solid ${color}30` }}
                    animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                    transition={{ duration: dur, repeat: Infinity, ease: "easeOut" }}
                  />
                  <motion.div
                    className="absolute rounded-full"
                    style={{ width: "70%", height: "70%", border: `1px solid ${color}20` }}
                    animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
                    transition={{ duration: dur, repeat: Infinity, delay: 0.5, ease: "easeOut" }}
                  />
                </>
              )}

              {/* The breathing orb — key forces clean animation restart */}
              <motion.div
                key={`orb-${phaseIdx}`}
                className="rounded-full"
                initial={{ scale: isExpand ? 0.35 : 1, opacity: isExpand ? 0.3 : 1 }}
                animate={{ scale, opacity: orbOpacity }}
                transition={{ duration: transitionDur, ease: "easeInOut" }}
                style={{
                  width: "75%",
                  height: "75%",
                  background: `radial-gradient(circle at 50% 35%, ${color}${isExpand ? "55" : isHold ? "55" : "18"} 0%, ${color}0a 50%, transparent 80%)`,
                  border: `1.5px solid ${color}${isExpand ? "66" : isHold ? "66" : "22"}`,
                  boxShadow: `0 0 ${glowSize}px ${color}${isExpand ? "44" : isHold ? "44" : "22"}, inset 0 0 ${glowSize * 0.6}px ${color}${isExpand ? "28" : isHold ? "28" : "14"}`,
                }}
              />

              {/* Phase label + countdown — centered overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <motion.div
                  key={`label-${phaseIdx}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-[15px] font-light tracking-[0.04em]"
                  style={{ color: isExpand ? color : "#E8EBE9" }}
                >
                  {phase.name}
                </motion.div>
                <motion.div
                  key={`count-${phaseIdx}-${countdown}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-[28px] font-extralight tabular-nums mt-0.5"
                  style={{
                    color: isExpand ? color : "#E8EBE9",
                    textShadow: isExpand ? `0 0 12px ${color}44` : "none",
                  }}
                >
                  {countdown}
                </motion.div>
              </div>
            </div>

            {/* Pattern selector — premium pills */}
            <div className="flex gap-1.5 mt-1">
              {(Object.keys(PATTERNS) as BreathPattern[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePatternChange(p)}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-medium tracking-wide transition-all ${
                    pattern === p
                      ? "text-black"
                      : "text-ink-muted border border-white/8 bg-white/[0.02] hover:text-ink"
                  }`}
                  style={pattern === p ? {
                    background: `linear-gradient(135deg, ${color}ee, ${color}aa)`,
                    boxShadow: `0 0 10px ${color}44`,
                  } : {}}
                >
                  {PATTERNS[p].label.split(" ")[0]}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-ink-muted text-center max-w-[220px] leading-[13px]">
              {config.desc}
            </p>
          </div>
        </div>
      </div>
  );
}
