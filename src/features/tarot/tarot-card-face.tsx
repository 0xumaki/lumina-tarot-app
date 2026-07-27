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
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let res = "";
  let x = n;
  for (const [v, s] of map) while (x >= v) { res += s; x -= v; }
  return res || "0";
}

/**
 * TarotCardFace — renders a tarot card face.
 * Attempts to load /tarot/{slug}.jpg; falls back to an elegant SVG composition
 * keyed off the card's data. Reversed cards are visually flipped.
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
      style={{ perspective: "1000px" }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={reversed ? { rotateY: 180 } : { rotateY: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
      >
        {/* Front face */}
        <FaceSide
          card={card}
          meta={meta}
          size={size}
          showImage={showImage && imgOk !== false}
          onImgError={() => setImgOk(false)}
          onImgLoad={() => setImgOk(true)}
        />
        {/* Reversed overlay marker (we keep the same face but show a small "RX" badge when reversed for clarity) */}
      </motion.div>
      {reversed && (
        <div className="absolute -top-2 -right-2 z-10 rounded-full bg-black/80 border border-gold/40 px-1.5 py-0.5 text-[9px] font-medium text-gold tracking-wider">
          RX
        </div>
      )}
    </div>
  );
}

function FaceSide({
  card,
  meta,
  size,
  showImage,
  onImgError,
  onImgLoad,
}: {
  card: TarotCard;
  meta: { glyph: string; color: string; label: string; accent: string };
  size: "sm" | "md" | "lg";
  showImage: boolean;
  onImgError: () => void;
  onImgLoad: () => void;
}) {
  const pad = size === "sm" ? 6 : size === "md" ? 10 : 14;
  const nameSize = size === "sm" ? 8 : size === "md" ? 11 : 13;
  const glyphSize = size === "sm" ? 34 : size === "md" ? 58 : 82;
  const numSize = size === "sm" ? 9 : size === "md" ? 12 : 15;

  return (
    <div
      className="absolute inset-0 rounded-[14px] overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #0d110f 0%, #070908 100%)",
        border: `1px solid ${meta.accent}40`,
        boxShadow: `0 0 0 1px rgba(255,255,255,0.04) inset, 0 8px 24px -10px rgba(0,0,0,0.8)`,
      }}
    >
      {/* gold filigree corner frame */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
        <rect x="3" y="3" rx="11" ry="11" width="calc(100% - 6px)" height="calc(100% - 6px)"
          fill="none" stroke={meta.accent} strokeOpacity="0.18" strokeWidth="0.6" />
      </svg>

      {showImage && (
        <img
          src={`/tarot/${card.id}.jpg`}
          alt={card.name}
          loading="lazy"
          onError={onImgError}
          onLoad={onImgLoad}
          className="absolute inset-0 w-full h-full object-cover opacity-90"
          style={{ mixBlendMode: "luminosity" }}
        />
      )}

      {/* SVG composition overlay (always rendered as the design layer; becomes the fallback when no image) */}
      {!showImage && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-between"
          style={{ padding: pad }}
        >
          {/* Top: roman numeral + suit glyph */}
          <div className="w-full flex items-center justify-between" style={{ color: meta.accent }}>
            <span style={{ fontSize: numSize, fontWeight: 500, letterSpacing: "0.04em", opacity: 0.9 }}>
              {card.arcana === "major" ? roman(card.number) : card.number}
            </span>
            <span style={{ fontSize: numSize, opacity: 0.8 }}>{meta.glyph}</span>
          </div>

          {/* Center glyph + name */}
          <div className="flex flex-col items-center gap-1.5 -mt-1">
            <div className="relative flex items-center justify-center" style={{ width: glyphSize, height: glyphSize }}>
              {/* outer glow ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle at 50% 45%, ${meta.accent}33 0%, ${meta.accent}08 50%, transparent 75%)`,
                  filter: "blur(2px)",
                }}
              />
              {/* decorative ring */}
              <svg className="absolute inset-0 w-full h-full" style={{ color: meta.accent }} aria-hidden>
                <circle cx="50%" cy="50%" r="47%" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="0.8" />
                <circle cx="50%" cy="50%" r="40%" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="0.5" strokeDasharray="2 3" />
              </svg>
              {/* the symbol */}
              <span
                style={{
                  color: meta.color,
                  fontSize: glyphSize * 0.46,
                  lineHeight: 1,
                  textShadow: `0 0 12px ${meta.accent}66`,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {card.symbol}
              </span>
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

      {/* subtle gradient sheen on top */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.5) 100%)",
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
        "relative shrink-0 overflow-hidden rounded-[14px]",
        sizes[size],
        className
      )}
      style={{
        background: "linear-gradient(160deg, #0d110f 0%, #050706 100%)",
        border: "1px solid rgba(197,168,124,0.3)",
      }}
    >
      <img
        src="/tarot/card-back.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
}
