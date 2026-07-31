import { NextResponse } from "next/server";
import { requireDevice } from "@/lib/device";
import { db } from "@/lib/db";
import { awardXp, XP_REWARDS } from "@/lib/xp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/manifest/confirm — confirm today's intention for a goal. */
export async function POST(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const body = await req.json().catch(() => ({}));
    const { goalId, note } = body as { goalId?: string; note?: string };
    if (!goalId)
      return NextResponse.json({ error: "goalId required" }, { status: 400 });

    const goal = await db.goal.findFirst({
      where: { id: goalId, deviceId: device.id },
    });
    if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

    const today = new Date().toISOString().slice(0, 10);

    // Upsert confirmation (unique per goal per day)
    const confirmation = await db.confirmation.upsert({
      where: { goalId_date: { goalId, date: today } },
      update: { note: note || null },
      create: { deviceId: device.id, goalId, date: today, note: note || null },
    });

    // Recompute streak
    const all = await db.confirmation.findMany({
      where: { goalId },
      orderBy: { date: "desc" },
    });
    const dates = new Set(all.map((c) => c.date));
    let streak = 0;
    const d = new Date();
    if (!dates.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
    while (dates.has(d.toISOString().slice(0, 10))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }

    // Update app badge (best-effort) — number of goals confirmed today
    const confirmedToday = await db.confirmation.count({
      where: { deviceId: device.id, date: today },
    });
    try {
      // @ts-ignore — navigator not available server-side; badges set client-side.
    } catch {}

    // Award XP for the confirmation (only if this is a new confirmation, not an update)
    let xpResult = null;
    const wasNew = confirmation.createdAt.toISOString() === confirmation.updatedAt.toISOString();
    if (wasNew) {
      xpResult = await awardXp(device.id, XP_REWARDS.goalConfirmation);
    }

    return NextResponse.json({
      confirmation,
      streak,
      confirmedToday,
      totalConfirmations: all.length,
      xp: xpResult,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
