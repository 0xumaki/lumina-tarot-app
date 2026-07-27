"use client";

import { create } from "zustand";

export type TabKey = "home" | "tarot" | "manifest" | "frequency" | "stats" | "premium" | "settings";

interface AppState {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  pendingPremiumAction: string | null;
  setPendingPremiumAction: (s: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  tab: "home",
  setTab: (tab) => set({ tab }),
  pendingPremiumAction: null,
  setPendingPremiumAction: (pendingPremiumAction) => set({ pendingPremiumAction }),
}));
