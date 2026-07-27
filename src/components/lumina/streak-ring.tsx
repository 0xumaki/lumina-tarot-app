"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";

/**
 * Circular streak ring — visualizes the user's daily confirmation streak.
 * Fills proportionally up to 7 days, then shows the flame fully lit.
 */
export function StreakRing({
  streak,
  size = 56,
}: {
  streak: number;
  size?: number;
}) {
  const stroke = 3;
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  // Cap visual progress at 7 days; beyond 7 the ring stays full + flame grows
  const progress = Math.min(1, streak / 7);
  const offset = c * (1 - progress);
  const lit = streak > 0;
  const flameScale = streak >= 7 ? 1.15 : streak >= 3 ? 1 : 0.85;

  const color = streak >= 7 ? "#E89A4A" : streak >= 3 ? "#B5CD7E" : "#7A8680";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: lit ? `drop-shadow(0 0 6px ${color}88)` : "none" }}
        />
      </svg>
      <motion.div
        className="relative z-10 flex flex-col items-center"
        animate={lit ? { scale: [1, 1.08, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{ transform: `scale(${flameScale})` }}
      >
        <Flame
          className="w-4 h-4"
          style={{ color, filter: lit ? `drop-shadow(0 0 4px ${color}aa)` : "none" }}
          strokeWidth={1.8}
        />
        <span className="text-[9px] font-medium text-ink leading-none mt-0.5 tabular-nums">
          {streak}
        </span>
      </motion.div>
    </div>
  );
}
