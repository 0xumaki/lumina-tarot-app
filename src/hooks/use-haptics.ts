"use client";

import * as React from "react";

/**
 * Haptic feedback helper.
 * Wraps navigator.vibrate with safe fallbacks.
 * Patterns are tuned for the Lumina ritual feel.
 */

type Pattern = "tap" | "draw" | "reveal" | "complete" | "error" | "tick";

const PATTERNS: Record<Pattern, number | number[]> = {
  tap: 8,                    // tiny tap
  draw: [12, 40, 18],        // shuffle/draw — double pulse
  reveal: [20, 30, 30],      // card flip
  complete: [10, 50, 10, 50, 25],  // success flourish
  error: [40, 30, 40],       // buzz
  tick: 5,                   // breathing phase tick
};

export function useHaptics() {
  return React.useCallback((pattern: Pattern = "tap") => {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    try {
      navigator.vibrate(PATTERNS[pattern]);
    } catch {
      // ignore — haptics are a progressive enhancement
    }
  }, []);
}
