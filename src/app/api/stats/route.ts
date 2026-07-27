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

    // ── Energy Insight: a narrative summary derived from usage patterns.
    const insight = buildInsight({
      totalReadings,
      readingsThisWeek,
      mostUsedSpread,
      totalConfirmations,
      bestStreak,
      bestStreakGoalTitle,
      totalMinutes,
      mostUsedIntention,
      achievedGoals,
      activeGoals,
    });

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
      insight,
      activity,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * Build a short, evocative "energy insight" — a narrative reading of the
 * user's patterns. Not AI-generated (deterministic, instant) but written to
 * feel personal. Returns a title + body + accent color + signature card glyph.
 */
function buildInsight(d: {
  totalReadings: number;
  readingsThisWeek: number;
  mostUsedSpread: string | null;
  totalConfirmations: number;
  bestStreak: number;
  bestStreakGoalTitle: string | null;
  totalMinutes: number;
  mostUsedIntention: string | null;
  achievedGoals: number;
  activeGoals: number;
}): { title: string; body: string; accent: string; glyph: string } {
  // Brand-new user
  if (d.totalReadings === 0 && d.totalConfirmations === 0 && d.totalMinutes === 0) {
    return {
      title: "A blank canvas",
      body: "Your energy signature is unwritten. Draw a card, set a goal, or tune a tone — your pattern will reveal itself here.",
      accent: "#7A8680",
      glyph: "✦",
    };
  }

  // Dominant dimension
  const tarotWeight = d.totalReadings * 2;
  const manifestWeight = d.totalConfirmations + d.bestStreak * 3;
  const freqWeight = d.totalMinutes;

  if (d.achievedGoals > 0) {
    return {
      title: "The manifester",
      body: `You've manifested ${d.achievedGoals} goal${d.achievedGoals > 1 ? "s" : ""} into being. The ritual works through you. ${d.bestStreak > 0 ? `Your ${d.bestStreak}-day streak on "${d.bestStreakGoalTitle}" is a living sigil.` : "Keep confirming to compound the signal."}`,
      accent: "#B5CD7E",
      glyph: "◉",
    };
  }

  if (manifestWeight >= tarotWeight && manifestWeight >= freqWeight) {
    return {
      title: "The devoted",
      body: `Manifestation is your home frequency. ${d.totalConfirmations} confirmation${d.totalConfirmations !== 1 ? "s" : ""} and a ${d.bestStreak}-day streak${d.bestStreakGoalTitle ? ` on "${d.bestStreakGoalTitle}"` : ""} — you build the future one day at a time.`,
      accent: "#B5CD7E",
      glyph: "🜃",
    };
  }

  if (freqWeight >= tarotWeight && freqWeight >= manifestWeight) {
    const intentionLabel = d.mostUsedIntention || "intention";
    return {
      title: "The resonator",
      body: `You lean into sound. ${d.totalMinutes} minute${d.totalMinutes !== 1 ? "s" : ""} of ${intentionLabel} resonance — your body knows the frequency before the mind does.`,
      accent: "#9E8AC9",
      glyph: "〰",
    };
  }

  if (d.mostUsedSpread === "Celtic Cross") {
    return {
      title: "The seeker of depth",
      body: `${d.totalReadings} readings, and you favour the Celtic Cross — you don't ask small questions. The deep layers answer you back.`,
      accent: "#C5A87C",
      glyph: "✦",
    };
  }

  if (d.totalReadings > 0) {
    return {
      title: "The cartomancer",
      body: `${d.totalReadings} reading${d.totalReadings !== 1 ? "s" : ""} drawn${d.mostUsedSpread ? `, mostly via ${d.mostUsedSpread}` : ""}. You read the world in symbols and trust what the cards mirror back.`,
      accent: "#C5A87C",
      glyph: "✦",
    };
  }

  return {
    title: "Finding your rhythm",
    body: "Your pattern is still emerging. Keep reading, confirming, and resonating — the insight will sharpen.",
    accent: "#C5A87C",
    glyph: "✦",
  };
}
