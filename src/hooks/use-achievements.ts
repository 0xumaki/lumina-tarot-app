"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { useRitual } from "@/hooks/use-ritual";
import { useAppStore } from "@/lib/store";
import {
  BADGES,
  computeUnlocks,
  allAchievementsUnlocked,
  TOTAL_BADGES,
  type BadgeCtx,
} from "@/lib/achievements";

/**
 * useAchievements — watches the user's activity context (readings, freq, goals,
 * ritual, streak) and detects:
 *   1. When a badge transitions from locked → unlocked (pushes "achievement" celebration)
 *   2. When ALL 36 badges become unlocked (pushes "mastery" celebration — unlocks rewards)
 *
 * Previously-seen unlocks are stored in localStorage so they don't re-celebrate on reload.
 * Uses a stable string key (sorted unlocked IDs) as the effect dependency to avoid loops.
 */

type MeData = {
  device: { isPremium: boolean };
  usage: {
    tarotReadings: number;
    frequencySec: number;
    activeGoals: number;
    confirmedToday: number;
  };
};

const STORAGE_KEY = "lumina.unlockedBadges";
const MASTERY_KEY = "lumina.masteryCelebrated";

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveSeen(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {}
}

export function useAchievements() {
  const api = useApi();
  const { ritual, streak } = useRitual();
  const pushCelebration = useAppStore((s) => s.pushCelebration);
  const seenRef = React.useRef<Set<string> | null>(null);
  const initializedRef = React.useRef(false);

  const { data: meData } = useQuery<MeData>({
    queryKey: ["me"],
    queryFn: async () => (await api("/api/me")).json(),
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    staleTime: 3000,
  });

  const ctx: BadgeCtx = React.useMemo(
    () => ({
      isPremium: !!meData?.device?.isPremium,
      readingsToday: meData?.usage?.tarotReadings ?? 0,
      confirmedToday: meData?.usage?.confirmedToday ?? 0,
      activeGoals: meData?.usage?.activeGoals ?? 0,
      freqSec: meData?.usage?.frequencySec ?? 0,
      streak: streak ?? 0,
      ritual,
    }),
    [meData, ritual, streak],
  );

  const currentlyUnlocked = React.useMemo(() => computeUnlocks(ctx), [ctx]);
  const allComplete = React.useMemo(() => allAchievementsUnlocked(ctx), [ctx]);

  // Stable string key — only changes when the actual unlock set changes
  const unlockedKey = React.useMemo(
    () => [...currentlyUnlocked].sort().join(","),
    [currentlyUnlocked],
  );

  // Detect newly-unlocked badges — depends on the stable string key, not the Set
  React.useEffect(() => {
    if (unlockedKey === "") return; // no unlocks yet

    if (seenRef.current === null) {
      // First run: initialize seen set from localStorage.
      seenRef.current = loadSeen();
      if (seenRef.current.size === 0) {
        seenRef.current = new Set(unlockedKey.split(","));
        saveSeen(seenRef.current);
      }
      initializedRef.current = true;
      return;
    }

    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    const currentIds = new Set(unlockedKey.split(","));
    const newlyUnlocked = [...currentIds].filter(
      (id) => !seenRef.current!.has(id),
    );

    if (newlyUnlocked.length > 0) {
      // Update seen set
      const newSeen = new Set([...seenRef.current, ...newlyUnlocked]);
      seenRef.current = newSeen;
      saveSeen(newSeen);

      // Push celebrations for each newly-unlocked badge
      for (const badgeId of newlyUnlocked) {
        const badge = BADGES.find((b) => b.id === badgeId);
        if (!badge) continue;
        pushCelebration({
          type: "achievement",
          id: `achievement-${badgeId}-${Date.now()}`,
          badgeId: badge.id,
          badgeName: badge.name,
          badgeDesc: badge.desc,
          badgeSvg: badge.svg,
          badgeColor: badge.color,
          tier: badge.tier,
        });
      }
    }
  }, [unlockedKey, pushCelebration]);

  // Separate effect: check for mastery (all 36 unlocked) — runs independently
  // so it fires even if the badges were already unlocked on first load.
  React.useEffect(() => {
    if (!allComplete) return;
    try {
      const alreadyCelebrated = localStorage.getItem(MASTERY_KEY);
      if (!alreadyCelebrated) {
        localStorage.setItem(MASTERY_KEY, new Date().toISOString());
        pushCelebration({
          type: "mastery",
          id: `mastery-${Date.now()}`,
          totalBadges: TOTAL_BADGES,
          unlockedAt: new Date().toISOString(),
        });
      }
    } catch {}
  }, [allComplete, pushCelebration]);

  return { currentlyUnlocked, allComplete, ctx, totalBadges: TOTAL_BADGES };
}
