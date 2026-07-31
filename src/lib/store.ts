"use client";

import { create } from "zustand";

export type TabKey = "home" | "tarot" | "manifest" | "frequency" | "stats" | "premium" | "settings";

/** A queued celebration event — either an achievement unlock or a mastery unlock (all 36 badges). */
export type CelebrationEvent =
  | {
      type: "achievement";
      id: string;
      badgeId: string;
      badgeName: string;
      badgeDesc: string;
      badgeSvg: string;
      badgeColor: string;
      tier: "free" | "premium";
    }
  | {
      type: "mastery";
      id: string;
      totalBadges: number;
      unlockedAt: string; // ISO date
    };

interface AppState {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  pendingPremiumAction: string | null;
  setPendingPremiumAction: (s: string | null) => void;
  /** Queue of celebration events to display one at a time. */
  celebrations: CelebrationEvent[];
  pushCelebration: (e: CelebrationEvent) => void;
  shiftCelebration: () => void;
  clearCelebrations: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  tab: "home",
  setTab: (tab) => set({ tab }),
  pendingPremiumAction: null,
  setPendingPremiumAction: (pendingPremiumAction) => set({ pendingPremiumAction }),
  celebrations: [],
  pushCelebration: (e) =>
    set((s) => {
      // Avoid duplicate queued events with the same id
      if (s.celebrations.some((c) => c.id === e.id)) return s;
      return { celebrations: [...s.celebrations, e] };
    }),
  shiftCelebration: () => set((s) => ({ celebrations: s.celebrations.slice(1) })),
  clearCelebrations: () => set({ celebrations: [] }),
}));
