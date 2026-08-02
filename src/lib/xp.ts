/**
 * Lumina — Experience & Leveling System (client-safe pure logic)
 *
 * 36-level mystical journey from "Seeker" (Lv 1) to "Luminary" (Lv 36).
 * This module contains ONLY pure functions and constants — no database imports.
 * Server-only logic (awardXp) lives in src/lib/xp-server.ts.
 */

export const MAX_LEVEL = 36;

/** Mystical level titles — a journey from beginner to enlightened master. */
export const LEVEL_NAMES: string[] = [
  "Seeker",        // 1
  "Wanderer",      // 2
  "Initiate",      // 3
  "Apprentice",    // 4
  "Novice",        // 5
  "Adept",         // 6
  "Student",       // 7
  "Disciple",      // 8
  "Observer",      // 9
  "Listener",      // 10
  "Dreamer",       // 11
  "Awakened",      // 12
  "Attuned",       // 13
  "Resonant",      // 14
  "Harmonized",    // 15
  "Aligned",       // 16
  "Balanced",      // 17
  "Centered",      // 18
  "Grounded",      // 19
  "Rooted",        // 20
  "Blooming",      // 21
  "Blossoming",    // 22
  "Rising",        // 23
  "Ascending",     // 24
  "Soaring",       // 25
  "Luminous",      // 26
  "Radiant",       // 27
  "Brilliant",     // 28
  "Illuminated",   // 29
  "Enlightened",   // 30
  "Sage",          // 31
  "Oracle",        // 32
  "Mystic",        // 33
  "Visionary",     // 34
  "Master",        // 35
  "Luminary",      // 36
];

/** Short evocative description for each level tier (shown in the journey view). */
export const LEVEL_TIERS: { range: [number, number]; name: string; desc: string }[] = [
  { range: [1, 6],   name: "The First Steps",   desc: "You are discovering the path." },
  { range: [7, 12],  name: "Awakening",         desc: "The senses sharpen. Patterns emerge." },
  { range: [13, 18], name: "Attunement",        desc: "You learn to hold your center." },
  { range: [19, 24], name: "The Ascent",        desc: "Energy moves through you, not against you." },
  { range: [25, 30], name: "Illumination",      desc: "You begin to glow from within." },
  { range: [31, 35], name: "Mastery",           desc: "The cards, tones, and desires speak your language." },
  { range: [36, 36], name: "Luminary",          desc: "You have become the light you sought." },
];

/** Cumulative XP required to reach a given level. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 80 * (level - 1);
}

/** The level a user with `xp` total XP has achieved. */
export function levelForXp(xp: number): number {
  if (xp <= 0) return 1;
  const level = Math.floor(xp / 80) + 1;
  return Math.min(MAX_LEVEL, Math.max(1, level));
}

export type LevelInfo = {
  level: number;
  name: string;
  tier: { name: string; desc: string };
  xp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  intoLevel: number;
  span: number;
  progress: number; // 0..1 within current level
  isMaxLevel: boolean;
  remainingToNext: number;
};

export function levelInfo(xp: number): LevelInfo {
  const level = levelForXp(xp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = level < MAX_LEVEL ? xpForLevel(level + 1) : currentLevelXp;
  const intoLevel = xp - currentLevelXp;
  const span = Math.max(1, nextLevelXp - currentLevelXp);
  const progress = level >= MAX_LEVEL ? 1 : intoLevel / span;
  const tier = LEVEL_TIERS.find((t) => level >= t.range[0] && level <= t.range[1]) ?? LEVEL_TIERS[0];
  return {
    level,
    name: LEVEL_NAMES[level - 1] ?? "Seeker",
    tier,
    xp,
    currentLevelXp,
    nextLevelXp,
    intoLevel,
    span,
    progress,
    isMaxLevel: level >= MAX_LEVEL,
    remainingToNext: level >= MAX_LEVEL ? 0 : nextLevelXp - xp,
  };
}

/** XP awarded for each activity type. */
export const XP_REWARDS = {
  tarotReading: 15,
  frequencyPerSec: 1 / 10, // 1 XP per 10 seconds of listening
  frequencyMin: 5,
  frequencyMax: 60,
  goalConfirmation: 20,
  moodCheckIn: 10,
  ritualStep: 10,
  ritualCompleteBonus: 50,
  cardOfDayReflection: 5,
} as const;

/** Compute XP for a frequency session based on duration. */
export function xpForFrequency(durationSec: number): number {
  const raw = durationSec * XP_REWARDS.frequencyPerSec;
  return Math.max(XP_REWARDS.frequencyMin, Math.min(XP_REWARDS.frequencyMax, Math.round(raw)));
}
