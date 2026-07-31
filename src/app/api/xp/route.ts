import { NextResponse } from "next/server";
import { requireDevice } from "@/lib/device";
import { levelInfo, MAX_LEVEL, LEVEL_NAMES, xpForLevel } from "@/lib/xp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/xp — current XP, level, progress, and the full 36-level journey.
 */
export async function GET(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const info = levelInfo(device.xp ?? 0);

    // Build the journey array (all 36 levels with unlock state)
    const journey = LEVEL_NAMES.map((name, i) => {
      const level = i + 1;
      const requiredXp = xpForLevel(level);
      return {
        level,
        name,
        requiredXp,
        unlocked: info.xp >= requiredXp,
        isCurrent: info.level === level,
      };
    });

    return NextResponse.json({
      xp: info.xp,
      level: info.level,
      levelName: info.name,
      tier: info.tier,
      progress: info.progress,
      currentLevelXp: info.currentLevelXp,
      nextLevelXp: info.nextLevelXp,
      intoLevel: info.intoLevel,
      span: info.span,
      remainingToNext: info.remainingToNext,
      isMaxLevel: info.isMaxLevel,
      maxLevel: MAX_LEVEL,
      journey,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 400 });
  }
}
