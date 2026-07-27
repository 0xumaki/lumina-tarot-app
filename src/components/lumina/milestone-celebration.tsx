"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, X } from "lucide-react";

/**
 * Milestone celebration overlay — shows when a user hits a streak milestone.
 * Triggers at 3, 7, 14, 30, 60, 90 days.
 */
const MILESTONES: Record<number, { title: string; desc: string; glyph: string; color: string }> = {
  3: { title: "Three days kindled", desc: "The signal is building. Keep going.", glyph: "🔥", color: "#B5CD7E" },
  7: { title: "The flame is lit", desc: "A full week of intention. You are becoming the ritual.", glyph: "✦", color: "#E7D2A8" },
  14: { title: "A fortnight of devotion", desc: "Two weeks. The pattern is yours now.", glyph: "◉", color: "#C5A87C" },
  30: { title: "Thirty days sealed", desc: "A month of manifestation. This is who you are.", glyph: "🌟", color: "#E89A4A" },
  60: { title: "Two moons", desc: "Sixty days. The rhythm is bone-deep.", glyph: "☽", color: "#9E8AC9" },
  90: { title: "A season of practice", desc: "Ninety days. You have crossed into mastery.", glyph: "☀", color: "#E7D2A8" },
};

export function MilestoneCelebration({
  streak,
  open,
  onClose,
}: {
  streak: number;
  open: boolean;
  onClose: () => void;
}) {
  const milestone = MILESTONES[streak];

  // Auto-close after 4 seconds
  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && milestone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

          {/* Confetti particles */}
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i / 24) * Math.PI * 2;
            const dist = 120 + Math.random() * 80;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;
            const colors = ["#C5A87C", "#B5CD7E", "#E7D2A8", "#9E8AC9", "#E89A4A"];
            return (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: 4 + Math.random() * 4,
                  height: 4 + Math.random() * 4,
                  background: colors[i % colors.length],
                  left: "50%",
                  top: "50%",
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                animate={{
                  x: [0, x, x * 1.2],
                  y: [0, y, y * 1.2 + 100],
                  opacity: [1, 1, 0],
                  scale: [0, 1, 0.5],
                  rotate: [0, 180, 360],
                }}
                transition={{ duration: 2.5, delay: i * 0.02, ease: "easeOut" }}
              />
            );
          })}

          {/* Center card */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="relative z-10 mx-4 w-full max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="lum-glass-float rounded-[28px] p-6 text-center relative overflow-hidden"
              style={{ boxShadow: `0 0 60px ${milestone.color}33` }}
            >
              {/* Glow background */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 30%, ${milestone.color}22 0%, transparent 60%)`,
                }}
              />

              <button
                onClick={onClose}
                className="absolute top-3 right-3 text-ink-muted hover:text-ink z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative z-10">
                {/* Pulsing glyph */}
                <motion.div
                  className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-[36px] mb-4"
                  style={{
                    background: `radial-gradient(circle at 50% 40%, ${milestone.color}33, transparent 70%)`,
                    border: `2px solid ${milestone.color}55`,
                    boxShadow: `0 0 30px ${milestone.color}44`,
                  }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  {milestone.glyph}
                </motion.div>

                {/* Streak number */}
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Flame className="w-5 h-5" style={{ color: milestone.color }} fill={milestone.color} />
                  <span className="text-[32px] font-light tabular-nums" style={{ color: milestone.color }}>
                    {streak}
                  </span>
                  <span className="text-[14px] text-ink-muted">days</span>
                </div>

                <h2 className="text-[18px] font-medium text-ink leading-[22px]">
                  {milestone.title}
                </h2>
                <p className="text-[13px] text-ink-muted mt-1.5 leading-[18px]">
                  {milestone.desc}
                </p>

                <div className="mt-4 text-[10px] uppercase tracking-[0.18em] text-ink-muted/60">
                  Tap to continue
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Check if a streak is a milestone. */
export function isMilestone(streak: number): boolean {
  return streak in MILESTONES;
}
