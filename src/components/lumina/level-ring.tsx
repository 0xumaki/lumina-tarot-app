"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { LEVEL_NAMES, MAX_LEVEL, levelInfo } from "@/lib/xp";

/**
 * LevelRing — compact circular level indicator for the home hero.
 * Shows the current level number in the center with a progress ring
 * filling toward the next level.
 */
export function LevelRing({
  xp,
  size = 56,
  onClick,
}: {
  xp: number;
  size?: number;
  onClick?: () => void;
}) {
  const info = levelInfo(xp);
  const stroke = 3;
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - info.progress);

  const goldGrad = "linear-gradient(135deg, #FBEFC8, #D4B27A, #8A6A2F)";

  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center shrink-0 group"
      style={{ width: size, height: size }}
      aria-label={`Level ${info.level} — ${info.name}`}
    >
      <svg width={size} height={size} className="absolute inset-0">
        <defs>
          <linearGradient id="lvl-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FBEFC8" />
            <stop offset="55%" stopColor="#D4B27A" />
            <stop offset="100%" stopColor="#8A6A2F" />
          </linearGradient>
        </defs>
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
          stroke="url(#lvl-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: "drop-shadow(0 0 5px rgba(197,168,124,0.5))" }}
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center">
        <span
          className="text-[18px] font-light leading-none tabular-nums"
          style={{ background: goldGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
        >
          {info.level}
        </span>
        <span className="text-[7.5px] uppercase tracking-[0.15em] text-gold/70 font-medium mt-0.5">
          {info.isMaxLevel ? "MAX" : "LVL"}
        </span>
      </div>
    </button>
  );
}

/**
 * LevelBadge — inline pill showing "Lv 12 · Attuned" for compact spaces.
 */
export function LevelBadge({ xp, onClick }: { xp: number; onClick?: () => void }) {
  const info = levelInfo(xp);
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-gold/10 border border-gold/25 hover:bg-gold/15 transition-colors"
    >
      <span
        className="text-[10px] font-medium tabular-nums"
        style={{ background: "linear-gradient(135deg, #FBEFC8, #D4B27A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
      >
        Lv {info.level}
      </span>
      <span className="text-[10px] text-ink-muted">·</span>
      <span className="text-[10px] text-gold/90 font-medium">{info.name}</span>
    </button>
  );
}

/**
 * LuminaryCrown — exclusive animated crown shown only when the user
 * reaches Level 36 (the maximum). Appears on the home hero.
 */
export function LuminaryCrown({ size = 44 }: { size?: number }) {
  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      initial={{ scale: 0, rotate: -30 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.3 }}
    >
      {/* Pulsing glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(197,168,124,0.35), transparent 70%)" }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Rotating sparkle ring */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gold" style={{ boxShadow: "0 0 8px #D4B27A" }} />
        <span className="absolute bottom-1 left-2 w-1 h-1 rounded-full bg-gold/60" />
        <span className="absolute bottom-1 right-2 w-1 h-1 rounded-full bg-gold/60" />
      </motion.div>
      {/* Crown SVG */}
      <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 72 72" fill="none" className="relative z-10">
        <defs>
          <linearGradient id="crown-grad" x1="14" y1="10" x2="58" y2="62" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FBEFC8" />
            <stop offset="55%" stopColor="#D4B27A" />
            <stop offset="100%" stopColor="#8A6A2F" />
          </linearGradient>
        </defs>
        <path
          d="M14 50 L18 26 L28 38 L36 22 L44 38 L54 26 L58 50 Z"
          fill="url(#crown-grad)"
          stroke="#FFFFFF"
          strokeOpacity="0.4"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
        <rect x="14" y="48" width="44" height="6" rx="1.5" fill="url(#crown-grad)" stroke="#FFFFFF" strokeOpacity="0.3" strokeWidth="0.5" />
        <circle cx="18" cy="26" r="2" fill="#FFFFFF" fillOpacity="0.85" />
        <circle cx="36" cy="22" r="2.4" fill="#FFFFFF" fillOpacity="0.9" />
        <circle cx="54" cy="26" r="2" fill="#FFFFFF" fillOpacity="0.85" />
        <rect x="32" y="48" width="8" height="6" rx="1" fill="#FFFFFF" fillOpacity="0.35" />
      </svg>
    </motion.div>
  );
}
