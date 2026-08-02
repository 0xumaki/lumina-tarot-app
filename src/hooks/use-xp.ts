"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { useAppStore } from "@/lib/store";

/**
 * useXp — fetches the user's current XP/level and detects level-ups.
 * When a level-up occurs, pushes a "levelup" celebration event to the global queue.
 *
 * Refetches every 8 seconds (and on window focus) to pick up XP changes
 * from activity endpoints.
 */

type XpData = {
  xp: number;
  level: number;
  levelName: string;
  tier: { name: string; desc: string };
  progress: number;
  currentLevelXp: number;
  nextLevelXp: number;
  intoLevel: number;
  span: number;
  remainingToNext: number;
  isMaxLevel: boolean;
  maxLevel: number;
  journey: { level: number; name: string; requiredXp: number; unlocked: boolean; isCurrent: boolean }[];
};

export function useXp() {
  const api = useApi();
  const qc = useQueryClient();
  const pushCelebration = useAppStore((s) => s.pushCelebration);
  const prevLevelRef = React.useRef<number | null>(null);

  const { data } = useQuery<XpData>({
    queryKey: ["xp"],
    queryFn: async () => (await api("/api/xp")).json(),
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    staleTime: 3000,
  });

  // Detect level-ups — only depends on the level number + xp (primitives, stable)
  const currentLevel = data?.level ?? 0;
  const currentXp = data?.xp ?? 0;
  const currentLevelName = data?.levelName ?? "";
  const isMaxLevel = data?.isMaxLevel ?? false;

  React.useEffect(() => {
    if (currentLevel === 0) return; // data not loaded yet

    if (prevLevelRef.current === null) {
      // First load — just store the level, don't celebrate
      prevLevelRef.current = currentLevel;
      return;
    }

    if (currentLevel > prevLevelRef.current) {
      pushCelebration({
        type: "levelup",
        id: `levelup-${currentLevel}-${Date.now()}`,
        level: currentLevel,
        levelName: currentLevelName,
        newXp: currentXp,
        isMaxLevel,
      });
    }

    prevLevelRef.current = currentLevel;
  }, [currentLevel, currentXp, currentLevelName, isMaxLevel, pushCelebration]);

  // Invalidate xp whenever an activity query updates — but throttle to avoid loops.
  // We use a ref to track the last invalidation time.
  const lastInvalidateRef = React.useRef(0);
  React.useEffect(() => {
    const unsub = qc.getQueryCache().subscribe((event) => {
      const key = event.query.queryKey[0];
      if (key === "me" || key === "ritual" || key === "goals") {
        if (event.type === "updated" && (event as any).action?.type === "success") {
          const now = Date.now();
          // Throttle: at most once per 2 seconds
          if (now - lastInvalidateRef.current > 2000) {
            lastInvalidateRef.current = now;
            qc.invalidateQueries({ queryKey: ["xp"] });
          }
        }
      }
    });
    return () => unsub();
  }, [qc]);

  return data;
}
