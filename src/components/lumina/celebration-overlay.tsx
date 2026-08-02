"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore, type CelebrationEvent } from "@/lib/store";

/**
 * CelebrationOverlay — global full-screen pop-up that celebrates:
 *   1. Achievement unlocks (vibrant badge icon + name + desc)
 *   2. Mastery unlocks — when ALL 36 achievements are complete (secret frequencies + custom theme unlocked)
 *
 * Reads from the global celebration queue (Zustand) and shows one event at a time.
 * Auto-dismisses after 6s or on tap. Confetti + radial glow + spring entrance.
 */
export function CelebrationOverlay() {
  const celebrations = useAppStore((s) => s.celebrations);
  const sessionActive = useAppStore((s) => s.sessionActive);
  const shift = useAppStore((s) => s.shiftCelebration);
  // Don't show celebrations during active sessions — queue them for after
  const current = !sessionActive ? (celebrations[0] ?? null) : null;

  // Auto-dismiss after 6s (mastery gets 8s)
  React.useEffect(() => {
    if (!current) return;
    const ms = current.type === "mastery" ? 8000 : 6000;
    const timer = setTimeout(() => shift(), ms);
    return () => clearTimeout(timer);
  }, [current, shift]);

  return (
    <AnimatePresence mode="wait">
      {current && (
        <motion.div
          key={current.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-lg"
          onClick={() => shift()}
        >
          {current.type === "achievement" ? (
            <AchievementCard event={current} onClose={() => shift()} />
          ) : (
            <MasteryCard event={current} onClose={() => shift()} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Confetti burst — N colored particles radiating outward. */
function Confetti({ color, count = 28 }: { color: string; count?: number }) {
  const colors = [color, "#C5A87C", "#B5CD7E", "#E7D2A8", "#9E8AC9", "#FFFFFF"];
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
        const dist = 90 + Math.random() * 80;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 3 + Math.random() * 5,
              height: 3 + Math.random() * 5,
              background: colors[i % colors.length],
              left: "50%",
              top: "42%",
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist + 60,
              opacity: [1, 1, 0],
              scale: [0, 1, 0.4],
              rotate: [0, 180, 360],
            }}
            transition={{ duration: 2.2, delay: 0.1 + i * 0.015, ease: "easeOut" }}
          />
        );
      })}
    </>
  );
}

function AchievementCard({
  event,
  onClose,
}: {
  event: Extract<CelebrationEvent, { type: "achievement" }>;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0, y: 30 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="relative mx-4 max-w-[320px]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Confetti */}
      <Confetti color={event.badgeColor} />

      <div
        className="lum-glass-float rounded-[28px] p-6 text-center relative overflow-hidden"
        style={{ boxShadow: `0 0 60px ${event.badgeColor}40` }}
      >
        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 25%, ${event.badgeColor}22, transparent 65%)`,
          }}
        />

        <div className="relative z-10">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-[10px] uppercase tracking-[0.28em] font-medium mb-3"
            style={{ color: event.badgeColor }}
          >
            ✦ Achievement Unlocked
          </motion.div>

          {/* Badge icon with glow + ring */}
          <motion.div
            className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center relative"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${event.badgeColor}33, ${event.badgeColor}10 60%, transparent 80%)`,
              border: `2px solid ${event.badgeColor}66`,
              boxShadow: `0 0 32px ${event.badgeColor}55, inset 0 0 20px ${event.badgeColor}20`,
            }}
            animate={{ scale: [0.8, 1.1, 1], rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Inner ring */}
            <div
              className="absolute inset-2 rounded-full pointer-events-none"
              style={{ border: `1px solid ${event.badgeColor}33` }}
            />
            {/* Rotating sparkle ring */}
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                style={{ background: event.badgeColor, boxShadow: `0 0 8px ${event.badgeColor}` }}
              />
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                style={{ background: event.badgeColor, opacity: 0.5 }}
              />
            </motion.div>
            <img
              src={event.badgeSvg}
              alt=""
              width={52}
              height={52}
              className="w-14 h-14 relative z-10"
              style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
            />
          </motion.div>

          {/* Badge name */}
          <motion.h3
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-[22px] font-light text-ink leading-[26px] mb-1"
          >
            {event.badgeName}
          </motion.h3>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[12.5px] text-ink-muted leading-[17px] max-w-[240px] mx-auto"
          >
            {event.badgeDesc}
          </motion.p>

          {/* Tier pill */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-3"
          >
            <span
              className="inline-block rounded-full px-3 py-1 text-[9.5px] uppercase tracking-[0.18em] font-medium"
              style={{
                background: `${event.badgeColor}1a`,
                border: `1px solid ${event.badgeColor}40`,
                color: event.badgeColor,
              }}
            >
              {event.tier === "premium" ? "Premium Badge" : "Free Badge"}
            </span>
          </motion.div>

          {/* Continue button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={onClose}
            className="mt-5 rounded-full px-6 py-2.5 text-[13px] font-medium bg-[#E8EBE9] text-black active:scale-[0.97] transition-all"
          >
            ✦ Continue
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * MasteryCard — shown when ALL 36 achievements are unlocked.
 * The biggest, most premium celebration. Unlocks secret frequencies + custom theme.
 */
function MasteryCard({
  event,
  onClose,
}: {
  event: Extract<CelebrationEvent, { type: "mastery" }>;
  onClose: () => void;
}) {
  const goldGrad = "linear-gradient(135deg, #FBEFC8, #D4B27A, #8A6A2F)";

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className="relative mx-4 max-w-[360px]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Triple confetti for mastery */}
      <Confetti color="#C5A87C" count={40} />
      <Confetti color="#9E8AC9" count={24} />
      <Confetti color="#B5CD7E" count={24} />

      <div
        className="lum-glass-float rounded-[32px] p-7 text-center relative overflow-hidden"
        style={{
          boxShadow: "0 0 80px rgba(197,168,124,0.5), 0 0 40px rgba(158,138,201,0.3)",
        }}
      >
        {/* Premium gradient border */}
        <div
          className="absolute inset-0 rounded-[32px] pointer-events-none"
          style={{ padding: "1.5px", background: goldGrad, WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude", opacity: 0.5 }}
        />
        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(circle at 50% 25%, rgba(197,168,124,0.2), transparent 65%)" }}
        />
        {/* Animated light rays */}
        <motion.div
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-px origin-bottom"
              style={{
                height: "180px",
                background: "linear-gradient(to top, transparent, rgba(197,168,124,0.15), transparent)",
                transform: `rotate(${i * 30}deg) translateY(-90px)`,
              }}
            />
          ))}
        </motion.div>

        <div className="relative z-10">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-[10px] uppercase tracking-[0.3em] text-gold font-medium mb-4"
          >
            ✦ Mastery Achieved ✦
          </motion.div>

          {/* Crown emblem */}
          <motion.div
            className="w-28 h-28 mx-auto mb-4 relative flex items-center justify-center"
            animate={{ scale: [0.7, 1.15, 1] }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            {/* Outer rotating ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: "2px solid transparent", borderTopColor: "#D4B27A", borderRightColor: "#D4B27A55" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            {/* Glow circle */}
            <div
              className="absolute inset-2 rounded-full"
              style={{
                background: "radial-gradient(circle at 50% 40%, rgba(197,168,124,0.3), transparent 70%)",
                border: "1.5px solid rgba(197,168,124,0.4)",
                boxShadow: "0 0 40px rgba(197,168,124,0.5), inset 0 0 20px rgba(197,168,124,0.2)",
              }}
            />
            {/* Crown SVG */}
            <svg width="56" height="56" viewBox="0 0 72 72" fill="none" className="relative z-10">
              <defs>
                <linearGradient id="mastery-crown" x1="14" y1="10" x2="58" y2="62" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FBEFC8" />
                  <stop offset="55%" stopColor="#D4B27A" />
                  <stop offset="100%" stopColor="#8A6A2F" />
                </linearGradient>
              </defs>
              <path d="M14 50 L18 26 L28 38 L36 22 L44 38 L54 26 L58 50 Z" fill="url(#mastery-crown)" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="0.6" strokeLinejoin="round" />
              <rect x="14" y="48" width="44" height="6" rx="1.5" fill="url(#mastery-crown)" stroke="#FFFFFF" strokeOpacity="0.3" strokeWidth="0.5" />
              <circle cx="18" cy="26" r="2" fill="#FFFFFF" fillOpacity="0.9" />
              <circle cx="36" cy="22" r="2.4" fill="#FFFFFF" fillOpacity="0.95" />
              <circle cx="54" cy="26" r="2" fill="#FFFFFF" fillOpacity="0.9" />
              <rect x="32" y="48" width="8" height="6" rx="1" fill="#FFFFFF" fillOpacity="0.4" />
            </svg>
          </motion.div>

          {/* Title */}
          <motion.h3
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-[26px] font-light text-ink leading-[30px] mb-1"
          >
            You are a <span style={{ background: goldGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Luminary</span>
          </motion.h3>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[12.5px] text-ink-muted leading-[17px] max-w-[280px] mx-auto"
          >
            All {event.totalBadges} achievements unlocked. The path is complete — the light you sought is now your own.
          </motion.p>

          {/* Rewards unlocked */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="mt-5 space-y-2"
          >
            <div className="text-[9.5px] uppercase tracking-[0.2em] text-gold/70 font-medium mb-2">Rewards Unlocked</div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-medium bg-gold/10 border border-gold/30 text-gold">
                ✦ 3 Secret Frequencies
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-medium bg-violet/10 border border-violet/30 text-violet" style={{ color: "#9E8AC9", borderColor: "rgba(158,138,201,0.3)", background: "rgba(158,138,201,0.1)" }}>
                ✦ Luminary Theme
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-medium bg-leaf/10 border border-leaf/30 text-leaf" style={{ color: "#B5CD7E", borderColor: "rgba(181,205,126,0.3)", background: "rgba(181,205,126,0.1)" }}>
                ✦ Hall of Light
              </span>
            </div>
          </motion.div>

          {/* Continue button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            onClick={onClose}
            className="mt-6 rounded-full px-8 py-3 text-[13px] font-medium text-black active:scale-[0.97] transition-all"
            style={{ background: goldGrad }}
          >
            ✦ Embrace the Light
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
