"use client";

import * as React from "react";

/**
 * Share a tarot reading using the Web Share API (mobile-native share sheet)
 * with a clipboard fallback for desktop.
 */

export interface ShareableReading {
  question: string;
  spreadType: string;
  cards: { name: string; reversed: boolean; position?: string }[];
  interpretation: string;
}

function formatReadingText(r: ShareableReading): string {
  const cardsText = r.cards
    .map((c, i) => {
      const pos = c.position ? `${c.position}: ` : `${i + 1}. `;
      return `${pos}${c.name}${c.reversed ? " (Reversed)" : ""}`;
    })
    .join("\n");

  // Trim interpretation to a reasonable length for sharing
  const interp = r.interpretation.length > 600
    ? r.interpretation.slice(0, 600) + "…"
    : r.interpretation;

  return `🌙 Lumina Reading

❝ ${r.question} ❞

${r.spreadType === "yes-no" ? "Yes / No Spread" : r.spreadType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Spread

${cardsText}

${interp}

— via Lumina · Tarot · Manifest · Frequencies`;
}

export function useShare() {
  return React.useCallback(async (reading: ShareableReading): Promise<"shared" | "copied" | "failed"> => {
    const text = formatReadingText(reading);

    // Try Web Share API first (mobile-native)
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "Lumina Reading",
          text,
        });
        return "shared";
      } catch (err: any) {
        // User cancelled or share failed — fall through to clipboard
        if (err?.name === "AbortError") return "failed";
      }
    }

    // Clipboard fallback
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        return "copied";
      } catch {}
    }

    return "failed";
  }, []);
}
