/**
 * Lumina — Achievement definitions (shared between settings-view and use-achievements hook).
 * 36 badges total: 18 free + 18 premium.
 */

export type RitualInfo = {
  step1Cleanse: boolean;
  step2Manifest: boolean;
  step3Tarot: boolean;
  step4Balance: boolean;
  completed: boolean;
} | null;

export type BadgeCtx = {
  isPremium: boolean;
  readingsToday: number;
  confirmedToday: number;
  activeGoals: number;
  freqSec: number;
  streak: number;
  ritual: RitualInfo;
};

export type Badge = {
  id: string;
  name: string;
  svg: string;
  desc: string;
  tier: "free" | "premium";
  color: string;
  unlock: (c: BadgeCtx) => boolean;
};

export const BADGES: Badge[] = [
  // ── Free tier (18) ────────────────────────────────────────────
  { id: "first-card",      name: "First Card",     svg: "/badges/first-card.svg",      desc: "Drew your first tarot card",        tier: "free",    color: "#D4B27A", unlock: (c) => c.readingsToday > 0 },
  { id: "card-reader",     name: "Card Reader",    svg: "/badges/card-reader.svg",     desc: "Drew 2+ cards in a day",            tier: "free",    color: "#D4B27A", unlock: (c) => c.readingsToday >= 2 },
  { id: "ritual-keeper",   name: "Ritual Keeper",  svg: "/badges/ritual-keeper.svg",   desc: "Began a daily ritual step",         tier: "free",    color: "#F09A3D", unlock: (c) => !!(c.ritual && (c.ritual.step1Cleanse || c.ritual.step2Manifest || c.ritual.step3Tarot || c.ritual.step4Balance)) },
  { id: "consistent",      name: "Consistent",     svg: "/badges/consistent.svg",      desc: "Confirmed a goal today",            tier: "free",    color: "#A4CC72", unlock: (c) => c.confirmedToday > 0 },
  { id: "resonator",       name: "Resonator",      svg: "/badges/resonator.svg",       desc: "Listened to a frequency",           tier: "free",    color: "#5FA9C7", unlock: (c) => c.freqSec > 0 },
  { id: "goal-setter",     name: "Goal Setter",    svg: "/badges/goal-setter.svg",     desc: "Set a manifestation goal",          tier: "free",    color: "#A4CC72", unlock: (c) => c.activeGoals > 0 },
  { id: "morning-light",   name: "Morning Light",  svg: "/badges/morning-light.svg",   desc: "Practice at sunrise",               tier: "free",    color: "#F09A3D", unlock: (c) => c.readingsToday > 0 || c.confirmedToday > 0 },
  { id: "moon-child",      name: "Moon Child",     svg: "/badges/moon-child.svg",      desc: "Practice after sundown",            tier: "free",    color: "#9B82D6", unlock: (c) => c.freqSec > 0 },
  { id: "mood-tracker",    name: "Mood Keeper",    svg: "/badges/mood-tracker.svg",    desc: "Tune in to how you feel",           tier: "free",    color: "#D876A0", unlock: (c) => c.confirmedToday > 0 },
  { id: "three-spread",    name: "Three Spread",   svg: "/badges/three-spread.svg",    desc: "Complete a 3-card spread",          tier: "free",    color: "#D4B27A", unlock: (c) => c.readingsToday >= 3 },
  { id: "first-frequency", name: "First Tone",     svg: "/badges/first-frequency.svg", desc: "First frequency session",           tier: "free",    color: "#5FA9C7", unlock: (c) => c.freqSec > 0 },
  { id: "breather",        name: "Breather",       svg: "/badges/breather.svg",        desc: "2+ minutes of breathing",           tier: "free",    color: "#A4CC72", unlock: (c) => c.freqSec >= 120 },
  { id: "reveal",          name: "The Reveal",     svg: "/badges/reveal.svg",          desc: "Reveal your card of the day",       tier: "free",    color: "#9B82D6", unlock: (c) => c.readingsToday > 0 },
  { id: "seven-seeker",    name: "Seven Seeker",   svg: "/badges/seven-seeker.svg",    desc: "Reach a 7-day streak",              tier: "free",    color: "#F09A3D", unlock: (c) => c.streak >= 7 },
  { id: "wheel-of-time",   name: "Wheel of Time",  svg: "/badges/wheel-of-time.svg",   desc: "Draw 5+ cards in a day",            tier: "free",    color: "#D4B27A", unlock: (c) => c.readingsToday >= 5 },
  { id: "cleansed",        name: "Cleansed",       svg: "/badges/cleansed.svg",        desc: "Complete the Cleanse step",         tier: "free",    color: "#5FA9C7", unlock: (c) => !!(c.ritual && c.ritual.step1Cleanse) },
  { id: "balanced",        name: "Balanced",       svg: "/badges/balanced.svg",        desc: "Complete the Balance step",         tier: "free",    color: "#9B82D6", unlock: (c) => !!(c.ritual && c.ritual.step4Balance) },
  { id: "asked",           name: "The Ask",        svg: "/badges/asked.svg",           desc: "Complete the Ask step",             tier: "free",    color: "#D4B27A", unlock: (c) => !!(c.ritual && c.ritual.step3Tarot) },
  // ── Premium tier (18) ─────────────────────────────────────────
  { id: "seer",            name: "Seer",           svg: "/badges/seer.svg",            desc: "Complete a Celtic Cross (10 cards)", tier: "premium", color: "#9B82D6", unlock: (c) => c.isPremium && c.readingsToday >= 10 },
  { id: "manifestor",      name: "Manifestor",     svg: "/badges/manifestor.svg",      desc: "Affirm a goal into being",          tier: "premium", color: "#A4CC72", unlock: (c) => c.isPremium && c.confirmedToday > 0 },
  { id: "deep-resonator",  name: "Deep Resonator", svg: "/badges/deep-resonator.svg",  desc: "10-minute frequency session",       tier: "premium", color: "#5FA9C7", unlock: (c) => c.isPremium && c.freqSec >= 600 },
  { id: "ritual-master",   name: "Ritual Master",  svg: "/badges/ritual-master.svg",   desc: "7-day ritual streak",               tier: "premium", color: "#D4B27A", unlock: (c) => c.isPremium && c.streak >= 7 },
  { id: "scholar",         name: "Scholar",        svg: "/badges/scholar.svg",         desc: "Draw 5+ cards in a session",        tier: "premium", color: "#D4B27A", unlock: (c) => c.isPremium && c.readingsToday >= 5 },
  { id: "mystic",          name: "Mystic",         svg: "/badges/mystic.svg",          desc: "Open the full frequency spectrum",  tier: "premium", color: "#9B82D6", unlock: (c) => c.isPremium && c.freqSec > 0 },
  { id: "priestess",       name: "Priestess",      svg: "/badges/priestess.svg",       desc: "Work with the High Priestess",      tier: "premium", color: "#9B82D6", unlock: (c) => c.isPremium && c.readingsToday > 0 },
  { id: "magician",        name: "Magician",       svg: "/badges/magician.svg",        desc: "Work with the Magician",            tier: "premium", color: "#D4B27A", unlock: (c) => c.isPremium && c.readingsToday > 0 },
  { id: "star-bearer",     name: "Star Bearer",    svg: "/badges/star-bearer.svg",     desc: "Work with the Star",                tier: "premium", color: "#F09A3D", unlock: (c) => c.isPremium && c.readingsToday > 0 },
  { id: "world-walker",    name: "World Walker",   svg: "/badges/world-walker.svg",    desc: "Complete a 3+ card spread",         tier: "premium", color: "#A4CC72", unlock: (c) => c.isPremium && c.readingsToday >= 3 },
  { id: "sun-child",       name: "Sun Child",      svg: "/badges/sun-child.svg",       desc: "Affirm under the Sun",              tier: "premium", color: "#F09A3D", unlock: (c) => c.isPremium && c.confirmedToday > 0 },
  { id: "moon-walker",     name: "Moon Walker",    svg: "/badges/moon-walker.svg",     desc: "Resonate with the Moon",            tier: "premium", color: "#9B82D6", unlock: (c) => c.isPremium && c.freqSec > 0 },
  { id: "tower-breaker",   name: "Tower Breaker",  svg: "/badges/tower-breaker.svg",   desc: "Break through with the Tower",      tier: "premium", color: "#F09A3D", unlock: (c) => c.isPremium && c.readingsToday >= 5 },
  { id: "phoenix",         name: "Phoenix",        svg: "/badges/phoenix.svg",         desc: "Transform with Death",              tier: "premium", color: "#D876A0", unlock: (c) => c.isPremium && c.confirmedToday > 0 },
  { id: "empress",         name: "Empress",        svg: "/badges/empress.svg",         desc: "Nurture a goal with the Empress",   tier: "premium", color: "#D876A0", unlock: (c) => c.isPremium && c.activeGoals > 0 },
  { id: "emperor",         name: "Emperor",        svg: "/badges/emperor.svg",         desc: "Structure a goal with the Emperor", tier: "premium", color: "#D4B27A", unlock: (c) => c.isPremium && c.activeGoals > 0 },
  { id: "hermit",          name: "Hermit",         svg: "/badges/hermit.svg",          desc: "Sit with 5+ min of frequency",      tier: "premium", color: "#F09A3D", unlock: (c) => c.isPremium && c.freqSec >= 300 },
  { id: "lovers",          name: "The Lovers",     svg: "/badges/lovers.svg",          desc: "Unite intention and feeling",       tier: "premium", color: "#D876A0", unlock: (c) => c.isPremium && c.confirmedToday > 0 },
];

/** Compute which badges are unlocked given a context. */
export function computeUnlocks(ctx: BadgeCtx): Set<string> {
  return new Set(BADGES.filter((b) => b.unlock(ctx)).map((b) => b.id));
}

/** Total number of badges (36). */
export const TOTAL_BADGES = BADGES.length;

/** Returns true if ALL badges are unlocked given the context. */
export function allAchievementsUnlocked(ctx: BadgeCtx): boolean {
  return computeUnlocks(ctx).size >= BADGES.length;
}
