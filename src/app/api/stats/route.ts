import { NextResponse } from "next/server";
import { requireDevice } from "@/lib/device";
import { db } from "@/lib/db";
import { SPREADS } from "@/lib/limits";
import { getPreset, type IntentionKey } from "@/lib/frequencies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Format a Date as a local YYYY-MM-DD string (no timezone shift). */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const SPREAD_LABELS: Record<string, string> = Object.fromEntries(
  SPREADS.map((s) => [s.id, s.name])
);

/**
 * GET /api/stats — analytics for the current device.
 * Returns readings / goals / frequency aggregates plus a 7-day activity array.
 */
export async function GET(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));

    const now = new Date();
    // Build the last 7 local days (today + 6 previous), as YYYY-MM-DD strings
    // and a Date threshold for createdAt-based filters.
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push(localDateStr(d));
    }
    const weekStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6,
      0,
      0,
      0,
      0
    );
    const daySet = new Set(days);

    // Personal datasets per device are small — fetch the fields we need in
    // parallel and aggregate in JS. This keeps the query surface simple and
    // avoids Prisma groupBy typing pitfalls.
    const [readings, goals, confirmations, sessions] = await Promise.all([
      db.reading.findMany({
        where: { deviceId: device.id },
        select: { spreadType: true, createdAt: true },
      }),
      db.goal.findMany({
        where: { deviceId: device.id },
        select: { id: true, title: true, status: true },
      }),
      db.confirmation.findMany({
        where: { deviceId: device.id },
        select: { goalId: true, date: true },
      }),
      db.frequencySession.findMany({
        where: { deviceId: device.id },
        select: {
          intention: true,
          frequencyHz: true,
          durationSec: true,
          createdAt: true,
        },
      }),
    ]);

    // ── Readings
    const totalReadings = readings.length;
    const readingsThisWeek = readings.filter(
      (r) => r.createdAt >= weekStart
    ).length;
    const spreadCounts = new Map<string, number>();
    for (const r of readings) {
      spreadCounts.set(
        r.spreadType,
        (spreadCounts.get(r.spreadType) ?? 0) + 1
      );
    }
    let mostUsedSpreadKey: string | null = null;
    let mostUsedSpreadCount = 0;
    for (const [k, c] of spreadCounts) {
      if (c > mostUsedSpreadCount) {
        mostUsedSpreadCount = c;
        mostUsedSpreadKey = k;
      }
    }
    const mostUsedSpread = mostUsedSpreadKey
      ? SPREAD_LABELS[mostUsedSpreadKey] ?? mostUsedSpreadKey
      : null;

    // ── Goals & confirmations
    const totalGoals = goals.length;
    const activeGoals = goals.filter((g) => g.status === "active").length;
    const achievedGoals = goals.filter((g) => g.status === "achieved").length;
    const totalConfirmations = confirmations.length;

    const confByDay = new Map<string, number>();
    for (const c of confirmations) {
      if (daySet.has(c.date)) {
        confByDay.set(c.date, (confByDay.get(c.date) ?? 0) + 1);
      }
    }
    const confirmationsThisWeek = days.map((d) => confByDay.get(d) ?? 0);

    // Current best streak across all goals.
    // A streak counts consecutive days ending today (or yesterday if today
    // isn't confirmed yet) — matching the manifest confirm endpoint.
    const confByGoal = new Map<string, Set<string>>();
    for (const c of confirmations) {
      let set = confByGoal.get(c.goalId);
      if (!set) {
        set = new Set();
        confByGoal.set(c.goalId, set);
      }
      set.add(c.date);
    }
    let bestStreak = 0;
    let bestStreakGoalId: string | null = null;
    for (const [goalId, dates] of confByGoal) {
      let streak = 0;
      const cursor = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      if (!dates.has(localDateStr(cursor))) {
        cursor.setDate(cursor.getDate() - 1);
      }
      while (dates.has(localDateStr(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }
      if (streak > bestStreak) {
        bestStreak = streak;
        bestStreakGoalId = goalId;
      }
    }
    const bestStreakGoal = bestStreakGoalId
      ? goals.find((g) => g.id === bestStreakGoalId) ?? null
      : null;
    const bestStreakGoalTitle = bestStreakGoal?.title ?? null;

    // ── Frequency
    const totalSessions = sessions.length;
    const totalSeconds = sessions.reduce((s, x) => s + x.durationSec, 0);
    const totalMinutes = Math.round(totalSeconds / 60);

    const intentionCounts = new Map<string, { count: number; hz: number }>();
    for (const s of sessions) {
      const cur = intentionCounts.get(s.intention);
      if (cur) {
        cur.count += 1;
      } else {
        intentionCounts.set(s.intention, {
          count: 1,
          hz: s.frequencyHz,
        });
      }
    }
    let mostUsedIntentionKey: string | null = null;
    let mostUsedIntentionCount = 0;
    let mostUsedIntentionHz: number | null = null;
    for (const [k, v] of intentionCounts) {
      if (v.count > mostUsedIntentionCount) {
        mostUsedIntentionCount = v.count;
        mostUsedIntentionKey = k;
        mostUsedIntentionHz = v.hz;
      }
    }
    let mostUsedIntention: string | null = null;
    if (mostUsedIntentionKey) {
      try {
        const preset = getPreset(mostUsedIntentionKey as IntentionKey);
        mostUsedIntention = preset.label;
      } catch {
        mostUsedIntention = mostUsedIntentionKey;
      }
    }

    const freqByDay = new Map<string, number>();
    for (const s of sessions) {
      if (s.createdAt >= weekStart) {
        const key = localDateStr(s.createdAt);
        freqByDay.set(key, (freqByDay.get(key) ?? 0) + s.durationSec);
      }
    }
    const minutesThisWeek = days.map((d) =>
      Math.round((freqByDay.get(d) ?? 0) / 60)
    );

    const readByDay = new Map<string, number>();
    for (const r of readings) {
      if (r.createdAt >= weekStart) {
        const key = localDateStr(r.createdAt);
        readByDay.set(key, (readByDay.get(key) ?? 0) + 1);
      }
    }

    const activity = days.map((d) => ({
      date: d,
      readings: readByDay.get(d) ?? 0,
      confirmations: confByDay.get(d) ?? 0,
      frequencySec: freqByDay.get(d) ?? 0,
    }));

    return NextResponse.json({
      memberSince: device.createdAt,
      readings: {
        total: totalReadings,
        thisWeek: readingsThisWeek,
        mostUsedSpread,
        mostUsedSpreadKey,
      },
      goals: {
        total: totalGoals,
        active: activeGoals,
        achieved: achievedGoals,
        totalConfirmations,
        bestStreak,
        bestStreakGoalTitle,
        confirmationsThisWeek,
      },
      frequency: {
        totalSessions,
        totalSeconds,
        totalMinutes,
        mostUsedIntention,
        mostUsedIntentionKey,
        mostUsedIntentionHz,
        minutesThisWeek,
      },
      activity,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
