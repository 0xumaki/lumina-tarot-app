"use client";

import * as React from "react";
import { motion } from "framer-motion";
import type { TarotCard } from "@/lib/tarot-data";
import { cn } from "@/lib/utils";

const SUIT_META: Record<
  string,
  { glyph: string; color: string; label: string; accent: string }
> = {
  major: { glyph: "✦", color: "#C5A87C", label: "Major Arcana", accent: "#C5A87C" },
  wands: { glyph: "🜂", color: "#E0A86B", label: "Wands · Fire", accent: "#E0A86B" },
  cups: { glyph: "🜄", color: "#8FB6D8", label: "Cups · Water", accent: "#8FB6D8" },
  swords: { glyph: "🜁", color: "#B5CD7E", label: "Swords · Air", accent: "#B5CD7E" },
  pentacles: { glyph: "🜃", color: "#C5A87C", label: "Pentacles · Earth", accent: "#C5A87C" },
};

function roman(n: number): string {
  const map: [number, string][] = [
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let res = "";
  let x = n;
  for (const [v, s] of map) while (x >= v) { res += s; x -= v; }
  return res || "0";
}

/**
 * TarotCardFace — premium award-winning card design.
 * Shows full-color RWS art with a gold gradient border frame,
 * subtle inner glow, and elegant typography overlay.
 */
export function TarotCardFace({
  card,
  reversed = false,
  size = "md",
  className,
  showImage = true,
}: {
  card: TarotCard;
  reversed?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  showImage?: boolean;
}) {
  const [imgOk, setImgOk] = React.useState<boolean | null>(null);
  const meta = SUIT_META[card.suit] || SUIT_META.major;

  const sizes = {
    sm: "w-[88px] h-[132px]",
    md: "w-[140px] h-[210px]",
    lg: "w-[200px] h-[300px]",
  };

  return (
    <div
      className={cn(
        "relative shrink-0 select-none",
        sizes[size],
        className
      )}
    >
      {/* Outer gold gradient border frame */}
      <div
        className="absolute inset-0 rounded-[16px] p-[1.5px]"
        style={{
          background: `linear-gradient(135deg, ${meta.accent}aa 0%, ${meta.accent}33 40%, rgba(255,255,255,0.08) 70%, ${meta.accent}44 100%)`,
        }}
      >
        <FaceSide
          card={card}
          meta={meta}
          size={size}
          reversed={reversed}
          showImage={showImage && imgOk !== false}
          onImgError={() => setImgOk(false)}
          onImgLoad={() => setImgOk(true)}
        />
      </div>
      {reversed && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 400, damping: 20 }}
          className="absolute -top-2 -right-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold text-black tracking-[0.1em] shadow-[0_0_12px_rgba(197,168,124,0.6)]"
          style={{ background: "linear-gradient(135deg, #E7D2A8, #C5A87C)" }}
        >
          RX
        </motion.div>
      )}
    </div>
  );
}

function FaceSide({
  card,
  meta,
  size,
  reversed,
  showImage,
  onImgError,
  onImgLoad,
}: {
  card: TarotCard;
  meta: { glyph: string; color: string; label: string; accent: string };
  size: "sm" | "md" | "lg";
  reversed: boolean;
  showImage: boolean;
  onImgError: () => void;
  onImgLoad: () => void;
}) {
  const nameSize = size === "sm" ? 8 : size === "md" ? 10 : 12;
  const glyphSize = size === "sm" ? 34 : size === "md" ? 58 : 82;
  const numSize = size === "sm" ? 9 : size === "md" ? 11 : 14;
  const showImageLayer = showImage;

  return (
    <div
      className="relative w-full h-full rounded-[14.5px] overflow-hidden"
      style={{
        background: "linear-gradient(165deg, #1a1410 0%, #0a0806 100%)",
      }}
    >
      {/* Full-color card image — NO mixBlendMode, full color preserved */}
      {showImageLayer && (
        <>
          <img
            src={`/tarot/${card.id}.jpg`}
            alt={card.name}
            loading="lazy"
            onError={onImgError}
            onLoad={onImgLoad}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Subtle vignette to blend edges into the dark frame */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)`,
            }}
          />
          {/* Bottom gradient for name legibility */}
          <div
            className="absolute inset-x-0 bottom-0 h-[35%] pointer-events-none"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
            }}
          />
          {/* Top gradient for numeral legibility */}
          <div
            className="absolute inset-x-0 top-0 h-[20%] pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)",
            }}
          />
          {/* Top-left: roman numeral / number */}
          <div
            className="absolute top-1.5 left-2 z-10 font-medium"
            style={{
              color: meta.accent,
              fontSize: numSize,
              letterSpacing: "0.06em",
              textShadow: "0 1px 3px rgba(0,0,0,0.8)",
            }}
          >
            {card.arcana === "major" ? roman(card.number) : card.number}
          </div>
          {/* Top-right: suit glyph */}
          <div
            className="absolute top-1.5 right-2 z-10"
            style={{
              color: meta.accent,
              fontSize: numSize,
              opacity: 0.8,
              textShadow: "0 1px 3px rgba(0,0,0,0.8)",
            }}
          >
            {meta.glyph}
          </div>
          {/* Bottom: card name */}
          <div className="absolute bottom-1.5 inset-x-1.5 z-10 text-center">
            <div
              className="font-medium text-white"
              style={{
                fontSize: nameSize,
                lineHeight: 1.2,
                textShadow: "0 1px 4px rgba(0,0,0,0.9)",
                letterSpacing: "0.01em",
              }}
            >
              {card.nameShort}
            </div>
            {size !== "sm" && (
              <div
                className="uppercase tracking-[0.16em] mt-0.5"
                style={{
                  fontSize: nameSize * 0.6,
                  color: meta.accent,
                  textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                }}
              >
                {meta.label.split(" · ")[0]}
              </div>
            )}
          </div>
        </>
      )}

      {/* SVG composition fallback (when no image) */}
      {!showImageLayer && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-between"
          style={{ padding: size === "sm" ? 6 : 10 }}
        >
          {/* Top: roman numeral + suit glyph */}
          <div className="w-full flex items-center justify-between" style={{ color: meta.accent }}>
            <span style={{ fontSize: numSize, fontWeight: 500, letterSpacing: "0.04em", opacity: 0.9 }}>
              {card.arcana === "major" ? roman(card.number) : card.number}
            </span>
            <span style={{ fontSize: numSize, opacity: 0.8 }}>{meta.glyph}</span>
          </div>

          {/* Center glyph */}
          <div className="flex flex-col items-center gap-1.5 -mt-1">
            <div className="relative flex items-center justify-center" style={{ width: glyphSize, height: glyphSize }}>
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle at 50% 45%, ${meta.accent}33 0%, ${meta.accent}08 50%, transparent 75%)`,
                  filter: "blur(2px)",
                }}
              />
              <svg className="absolute inset-0 w-full h-full" style={{ color: meta.accent }} aria-hidden>
                <circle cx="50%" cy="50%" r="47%" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="0.8" />
                <circle cx="50%" cy="50%" r="40%" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="0.5" strokeDasharray="2 3" />
              </svg>
              <motion.span
                animate={{ rotate: reversed ? 180 : 0 }}
                transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
                style={{
                  color: meta.color,
                  fontSize: glyphSize * 0.46,
                  lineHeight: 1,
                  textShadow: `0 0 12px ${meta.accent}66`,
                  position: "relative",
                  zIndex: 1,
                  display: "inline-block",
                }}
              >
                {card.symbol}
              </motion.span>
            </div>
          </div>

          {/* Bottom: name */}
          <div className="w-full text-center">
            <div
              className="font-medium tracking-[0.02em] text-ink"
              style={{ fontSize: nameSize, lineHeight: 1.15 }}
            >
              {card.nameShort}
            </div>
            <div
              className="uppercase tracking-[0.18em] mt-0.5"
              style={{ fontSize: nameSize * 0.62, color: meta.accent, opacity: 0.7 }}
            >
              {meta.label.split(" · ")[0]}
            </div>
          </div>
        </div>
      )}

      {/* Inner highlight for premium depth */}
      <div
        className="absolute inset-0 rounded-[14.5px] pointer-events-none"
        style={{
          boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.08)",
        }}
      />
    </div>
  );
}

/** A card-back (ornate gold mandala on black). Used while shuffling / face-down. */
export function TarotCardBack({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "w-[88px] h-[132px]",
    md: "w-[140px] h-[210px]",
    lg: "w-[200px] h-[300px]",
  };
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-[16px] p-[1.5px]",
        sizes[size],
        className
      )}
      style={{
        background: "linear-gradient(135deg, rgba(197,168,124,0.6) 0%, rgba(255,255,255,0.03) 40%, rgba(197,168,124,0.3) 100%)",
      }}
    >
      <div
        className="relative w-full h-full rounded-[14.5px] overflow-hidden"
        style={{ background: "linear-gradient(165deg, #1a1410 0%, #050706 100%)" }}
      >
        <img
          src="/tarot/card-back.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>
    </div>
  );
}
