import { NextResponse } from "next/server";
import { requireDevice } from "@/lib/device";
import { db } from "@/lib/db";
import { awardXp, XP_REWARDS } from "@/lib/xp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * GET /api/mood — today's mood + last 7 days for the trend.
 */
export async function GET(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const today = todayStr();

    const todayMood = await db.mood.findUnique({
      where: { deviceId_date: { deviceId: device.id, date: today } },
    });

    // Last 7 days
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(todayStr(d));
    }
    const recent = await db.mood.findMany({
      where: { deviceId: device.id, date: { in: days } },
      orderBy: { date: "asc" },
    });
    const week = days.map((d) => {
      const m = recent.find((r) => r.date === d);
      return { date: d, mood: m?.mood ?? null, note: m?.note ?? null };
    });

    return NextResponse.json({
      today: todayMood
        ? { mood: todayMood.mood, note: todayMood.note, date: todayMood.date }
        : null,
      week,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * POST /api/mood — save or update today's mood.
 * Body: { mood: number (1-5), note?: string }
 */
export async function POST(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const body = await req.json().catch(() => ({}));
    const { mood, note } = body as { mood?: number; note?: string };

    if (!mood || mood < 1 || mood > 5) {
      return NextResponse.json({ error: "Mood must be 1-5" }, { status: 400 });
    }

    const today = todayStr();
    const existing = await db.mood.findUnique({
      where: { deviceId_date: { deviceId: device.id, date: today } },
    });
    const entry = await db.mood.upsert({
      where: { deviceId_date: { deviceId: device.id, date: today } },
      update: { mood, note: note?.trim() || null },
      create: { deviceId: device.id, date: today, mood, note: note?.trim() || null },
    });

    // Award XP only on first check-in of the day (not on update)
    let xpResult = null;
    if (!existing) {
      xpResult = await awardXp(device.id, XP_REWARDS.moodCheckIn);
    }

    return NextResponse.json({ mood: entry, xp: xpResult });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
