"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { GlassCard, ShellCard, Divider } from "@/components/lumina/primitives";

/**
 * Hall of Light — a constellation of Luminaries who have completed all 36 achievements.
 * Shown in Settings when the user has achieved mastery (all 36 badges unlocked).
 *
 * Features:
 * - The user's own star (highlighted, pulsing) at the center
 * - A constellation of anonymous fellow Luminaries (mystical names) connected by faint lines
 * - Each star twinkles independently
 * - The user's star has a crown marker
 */

type LuminaryNode = {
  id: string;
  name: string;
  x: number; // 0-100 %
  y: number; // 0-100 %
  size: number;
  color: string;
  isYou?: boolean;
};

// 11 fellow Luminaries + the user at center = 12 stars in the constellation
const FELLOW_LUMINARIES: LuminaryNode[] = [
  { id: "l1",  name: "Aria of the Vale",      x: 18, y: 22, size: 3, color: "#E7D2A8" },
  { id: "l2",  name: "Caelum Walker",         x: 78, y: 18, size: 2.5, color: "#9E8AC9" },
  { id: "l3",  name: "Solene Brightward",     x: 12, y: 55, size: 3.5, color: "#F09A3D" },
  { id: "l4",  name: "Thorne the Patient",    x: 85, y: 50, size: 2.8, color: "#B5CD7E" },
  { id: "l5",  name: "Mira Starborn",         x: 30, y: 78, size: 3, color: "#9E8AC9" },
  { id: "l6",  name: "Orin Deepwater",        x: 72, y: 82, size: 2.5, color: "#5FA9C7" },
  { id: "l7",  name: "Vesper Lumina",         x: 45, y: 12, size: 2.8, color: "#E7D2A8" },
  { id: "l8",  name: "Ren the Quiet Flame",   x: 60, y: 88, size: 3.2, color: "#F09A3D" },
  { id: "l9",  name: "Elara Moonward",        x: 8,  y: 38, size: 2.5, color: "#9E8AC9" },
  { id: "l10", name: "Kai of Still Waters",   x: 92, y: 70, size: 3, color: "#5FA9C7" },
  { id: "l11", name: "Nyx Goldenheart",       x: 50, y: 92, size: 2.8, color: "#E7D2A8" },
];

// Connection lines between nearby stars (pairs of indices into the full array including user at center)
const CONNECTIONS: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5],
  [0, 6], [1, 6], [4, 7], [5, 7], [2, 8], [3, 9],
  [7, 10], [4, 10], [6, 0], [6, 1],
];

export function HallOfLight({ unlockedAt }: { unlockedAt: string }) {
  const dateStr = new Date(unlockedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // The user's star at center
  const userNode: LuminaryNode = {
    id: "you",
    name: "You",
    x: 50,
    y: 50,
    size: 5,
    color: "#E7D2A8",
    isYou: true,
  };
  const allNodes = [userNode, ...FELLOW_LUMINARIES];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <ShellCard className="overflow-hidden">
        <div className="relative p-4 lum-glow-gold">
          {/* Header */}
          <div className="relative z-10 flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
              <h3 className="text-[12px] uppercase tracking-[0.22em] text-gold font-medium">Hall of Light</h3>
            </div>
            <span className="text-[9.5px] uppercase tracking-[0.18em] text-gold/60 font-medium">12 Luminaries</span>
          </div>
          <p className="relative z-10 text-[11px] text-ink-muted leading-[15px] mb-3 max-w-[300px]">
            You joined the constellation of seekers who have walked the full path. Your star shines at the center.
          </p>

          {/* Constellation canvas */}
          <div
            className="relative w-full rounded-2xl overflow-hidden border border-gold/15"
            style={{
              aspectRatio: "1 / 1",
              background: "radial-gradient(circle at 50% 50%, rgba(197,168,124,0.06), transparent 70%), #050302",
              minHeight: "280px",
            }}
          >
            {/* Starfield background — tiny static dots */}
            {Array.from({ length: 40 }).map((_, i) => {
              const left = (i * 37) % 100;
              const top = (i * 53) % 100;
              const size = 0.5 + ((i * 7) % 10) / 10;
              return (
                <div
                  key={`bg-${i}`}
                  className="absolute rounded-full"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    background: "rgba(255,255,255,0.25)",
                  }}
                />
              );
            })}

            {/* Connection lines (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              {CONNECTIONS.map(([a, b], i) => {
                const na = allNodes[a];
                const nb = allNodes[b];
                return (
                  <motion.line
                    key={`line-${i}`}
                    x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                    stroke="rgba(231, 210, 168, 0.12)"
                    strokeWidth={0.15}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, delay: 0.5 + i * 0.05, ease: "easeOut" }}
                  />
                );
              })}
            </svg>

            {/* Star nodes */}
            {allNodes.map((node, i) => (
              <motion.div
                key={node.id}
                className="absolute"
                style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 200, damping: 15 }}
              >
                {/* Glow halo */}
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: `${node.size * 6}px`,
                    height: `${node.size * 6}px`,
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    background: `radial-gradient(circle, ${node.color}33, transparent 70%)`,
                  }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Star core */}
                <motion.div
                  className="relative rounded-full"
                  style={{
                    width: `${node.size}px`,
                    height: `${node.size}px`,
                    background: node.color,
                    boxShadow: `0 0 ${node.size * 2}px ${node.color}, 0 0 ${node.size * 4}px ${node.color}66`,
                  }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5 + i * 0.2, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Crown marker for "you" */}
                {node.isYou && (
                  <motion.div
                    className="absolute"
                    style={{
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -180%)",
                    }}
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 72 72" fill="none">
                      <defs>
                        <linearGradient id="hol-crown" x1="14" y1="10" x2="58" y2="62" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#FBEFC8" />
                          <stop offset="55%" stopColor="#D4B27A" />
                          <stop offset="100%" stopColor="#8A6A2F" />
                        </linearGradient>
                      </defs>
                      <path d="M14 50 L18 26 L28 38 L36 22 L44 38 L54 26 L58 50 Z" fill="url(#hol-crown)" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="0.8" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                )}
                {/* Name label (only for "you" + on hover for others — keep simple: show "you" always, others hidden) */}
                {node.isYou && (
                  <div
                    className="absolute whitespace-nowrap text-[9px] uppercase tracking-[0.15em] font-medium text-gold"
                    style={{ left: "50%", top: "50%", transform: "translate(-50%, 180%)", marginTop: "4px" }}
                  >
                    You
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <Divider className="my-3" />
          <div className="relative z-10 flex items-center justify-between text-[10px]">
            <span className="text-ink-muted">Your star ascended</span>
            <span className="text-gold font-medium">{dateStr}</span>
          </div>
        </div>
      </ShellCard>
    </motion.div>
  );
}
