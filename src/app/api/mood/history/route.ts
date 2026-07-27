import { NextResponse } from "next/server";
import { requireDevice } from "@/lib/device";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/mood/history — last 30 days of mood data for the history chart.
 */

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));

    const days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(localDateStr(d));
    }

    const moods = await db.mood.findMany({
      where: { deviceId: device.id, date: { in: days } },
      orderBy: { date: "asc" },
      select: { date: true, mood: true, note: true },
    });

    const moodByDay = new Map(moods.map((m) => [m.date, { mood: m.mood, note: m.note }]));
    const week = days.map((d) => ({
      date: d,
      mood: moodByDay.get(d)?.mood ?? null,
      note: moodByDay.get(d)?.note ?? null,
    }));

    const moodValues = moods.map((m) => m.mood);
    const average = moodValues.length > 0
      ? Math.round((moodValues.reduce((a, b) => a + b, 0) / moodValues.length) * 10) / 10
      : null;

    // Trend: compare last 7 days avg to previous 7 days avg
    const last7 = week.slice(23).filter((w) => w.mood !== null).map((w) => w.mood!);
    const prev7 = week.slice(16, 23).filter((w) => w.mood !== null).map((w) => w.mood!);
    const last7Avg = last7.length ? last7.reduce((a, b) => a + b, 0) / last7.length : null;
    const prev7Avg = prev7.length ? prev7.reduce((a, b) => a + b, 0) / prev7.length : null;
    let trend: "rising" | "falling" | "steady" | null = null;
    if (last7Avg !== null && prev7Avg !== null) {
      const diff = last7Avg - prev7Avg;
      if (diff > 0.3) trend = "rising";
      else if (diff < -0.3) trend = "falling";
      else trend = "steady";
    }

    return NextResponse.json({
      days: week,
      average,
      daysLogged: moodValues.length,
      trend,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
