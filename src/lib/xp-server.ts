/**
 * Lumina — XP server-side logic (awardXp).
 * This module imports the database and must ONLY be used in API routes / server components.
 * Client-safe XP logic lives in src/lib/xp.ts.
 */

import { levelForXp, levelInfo, type AwardResult } from "@/lib/xp";

export type { AwardResult };

export { XP_REWARDS, xpForFrequency } from "@/lib/xp";
export { levelForXp, levelInfo } from "@/lib/xp";

/**
 * Award XP to a device and return whether a level-up occurred.
 * Called by activity API routes after persisting the activity.
 */
export async function awardXp(deviceId: string, amount: number): Promise<AwardResult> {
  const { db } = await import("@/lib/db");
  const before = await db.device.findUnique({ where: { id: deviceId }, select: { xp: true } });
  const prevXp = before?.xp ?? 0;
  const prevLevel = levelForXp(prevXp);
  const awarded = Math.max(0, Math.round(amount));
  const newXp = prevXp + awarded;
  await db.device.update({ where: { id: deviceId }, data: { xp: newXp } });
  const newLevel = levelForXp(newXp);
  const info = levelInfo(newXp);
  return {
    awarded,
    newXp,
    newLevel,
    newLevelName: info.name,
    leveledUp: newLevel > prevLevel,
    levelsGained: newLevel - prevLevel,
    previousLevel: prevLevel,
    isMaxLevel: info.isMaxLevel,
  };
}
