/**
 * Free vs Premium limits.
 * Free: 2 tarot questions/day (Yes/No + single card only), 1 manifestation goal,
 *       30s frequency per session.
 * Premium: unlimited tarot + all spreads, unlimited goals, unlimited frequency.
 */

export const FREE_LIMITS = {
  tarotReadingsPerDay: 2,
  manifestGoals: 1,
  frequencySecondsPerSession: 30,
  allowedSpreads: ["yes-no", "single"] as const,
} as const;

export const PREMIUM_LIMITS = {
  tarotReadingsPerDay: Infinity,
  manifestGoals: Infinity,
  frequencySecondsPerSession: Infinity,
  allowedSpreads: [
    "yes-no",
    "single",
    "three-card",
    "relationship",
    "career",
    "celtic-cross",
  ] as const,
} as const;

export type SpreadType =
  | "yes-no"
  | "single"
  | "three-card"
  | "relationship"
  | "career"
  | "celtic-cross";

export const SPREADS: {
  id: SpreadType;
  name: string;
  cardCount: number;
  premium: boolean;
  description: string;
  positions?: string[];
}[] = [
  {
    id: "yes-no",
    name: "Yes / No",
    cardCount: 1,
    premium: false,
    description: "A single card to answer your yes-or-no question.",
    positions: ["The Answer"],
  },
  {
    id: "single",
    name: "Single Card",
    cardCount: 1,
    premium: false,
    description: "One card of guidance for your question.",
    positions: ["Guidance"],
  },
  {
    id: "three-card",
    name: "Three Card Spread",
    cardCount: 3,
    premium: true,
    description: "Past · Present · Future — the classic reading.",
    positions: ["Past", "Present", "Future"],
  },
  {
    id: "relationship",
    name: "Relationship",
    cardCount: 4,
    premium: true,
    description: "You · Them · Connection · Path forward.",
    positions: ["You", "Them", "The Bond", "Where It Leads"],
  },
  {
    id: "career",
    name: "Career & Path",
    cardCount: 4,
    premium: true,
    description: "Where you are · The challenge · Your gift · The outcome.",
    positions: ["Now", "Challenge", "Your Gift", "Outcome"],
  },
  {
    id: "celtic-cross",
    name: "Celtic Cross",
    cardCount: 10,
    premium: true,
    description: "The legendary ten-card deep reading.",
    positions: [
      "Present",
      "Challenge",
      "Foundation",
      "Recent Past",
      "Possibility",
      "Near Future",
      "Self",
      "Environment",
      "Hopes & Fears",
      "Outcome",
    ],
  },
];

export function getSpread(id: SpreadType) {
  return SPREADS.find((s) => s.id === id);
}

export function canUseSpread(isPremium: boolean, spread: SpreadType): boolean {
  if (isPremium) return true;
  return (FREE_LIMITS.allowedSpreads as readonly string[]).includes(spread);
}

export function todayStr(date = new Date()): string {
  // Local YYYY-MM-DD
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function getOrCreateUsage(deviceId: string, date: string) {
  const { db } = await import("@/lib/db");
  return db.usageLog.upsert({
    where: { deviceId_date: { deviceId, date } },
    update: {},
    create: { deviceId, date },
  });
}

export async function incrementTarotUsage(deviceId: string, date: string) {
  const { db } = await import("@/lib/db");
  return db.usageLog.update({
    where: { deviceId_date: { deviceId, date } },
    data: { tarotReadings: { increment: 1 } },
  });
}

export async function addFrequencyUsage(
  deviceId: string,
  date: string,
  seconds: number
) {
  const { db } = await import("@/lib/db");
  return db.usageLog.update({
    where: { deviceId_date: { deviceId, date } },
    data: { frequencySec: { increment: seconds } },
  });
}

export function remainingTarotReadings(
  isPremium: boolean,
  usedToday: number
): number {
  if (isPremium) return Infinity;
  return Math.max(0, FREE_LIMITS.tarotReadingsPerDay - usedToday);
}
