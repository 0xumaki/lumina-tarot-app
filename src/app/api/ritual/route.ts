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
 * GET /api/ritual — returns today's ritual progress + streak.
 */
export async function GET(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const today = todayStr();

    const log = await db.ritualLog.findUnique({
      where: { deviceId_date: { deviceId: device.id, date: today } },
    });

    // Compute ritual streak — count consecutive days with completed=true
    // BUT allow 1 gap per week (streak freeze): if a day is missing, check if
    // the user has freezes available this week. If so, skip the gap.
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = todayStr(weekAgo);

    const allLogs = await db.ritualLog.findMany({
      where: { deviceId: device.id, date: { gte: weekAgoStr } },
      orderBy: { date: "desc" },
      select: { date: true, completed: true },
    });

    const completedDates = new Set(allLogs.filter((l) => l.completed).map((l) => l.date));
    const allDatesThisWeek = allLogs.map((l) => l.date);

    // Count gaps (days where no log exists or completed=false) in the last 7 days
    let gapsThisWeek = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = todayStr(d);
      if (!completedDates.has(ds)) gapsThisWeek++;
    }
    // 1 freeze available per week (minus gaps already used)
    const freezesAvailable = Math.max(0, 1 - Math.max(0, gapsThisWeek - 1));

    // Compute streak with freeze support: allow 1 gap
    let streak = 0;
    let freezeUsed = false;
    const cursor = new Date();
    if (!completedDates.has(today)) cursor.setDate(cursor.getDate() - 1);
    while (true) {
      const ds = todayStr(cursor);
      if (completedDates.has(ds)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else if (!freezeUsed) {
        // Use a freeze — skip this day
        freezeUsed = true;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    return NextResponse.json({
      today: {
        step1Cleanse: log?.step1Cleanse ?? false,
        step2Manifest: log?.step2Manifest ?? false,
        step3Tarot: log?.step3Tarot ?? false,
        step4Balance: log?.step4Balance ?? false,
        completed: log?.completed ?? false,
      },
      streak,
      freezesAvailable,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * POST /api/ritual — mark a step as complete.
 * Body: { step: 1 | 2 | 3 | 4 }
 */
export async function POST(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const body = await req.json().catch(() => ({}));
    const { step } = body as { step?: number };

    if (![1, 2, 3, 4].includes(step || 0)) {
      return NextResponse.json({ error: "Invalid step (1-4)" }, { status: 400 });
    }

    const today = todayStr();
    const stepField = `step${step}` as "step1Cleanse" | "step2Manifest" | "step3Tarot" | "step4Balance";
    const fieldMap: Record<number, string> = {
      1: "step1Cleanse",
      2: "step2Manifest",
      3: "step3Tarot",
      4: "step4Balance",
    };

    // Upsert and set the step to true
    const existing = await db.ritualLog.findUnique({
      where: { deviceId_date: { deviceId: device.id, date: today } },
    });

    const data: any = { [fieldMap[step]]: true };
    // Check if ritual is now complete (steps 1, 2, 4 required; 3 optional)
    const merged = {
      step1Cleanse: step === 1 ? true : existing?.step1Cleanse ?? false,
      step2Manifest: step === 2 ? true : existing?.step2Manifest ?? false,
      step4Balance: step === 4 ? true : existing?.step4Balance ?? false,
    };
    data.completed = merged.step1Cleanse && merged.step2Manifest && merged.step4Balance;

    const log = await db.ritualLog.upsert({
      where: { deviceId_date: { deviceId: device.id, date: today } },
      update: data,
      create: {
        deviceId: device.id,
        date: today,
        ...data,
      },
    });

    // If just completed, compute new streak
    let streak = 0;
    if (log.completed) {
      const allLogs = await db.ritualLog.findMany({
        where: { deviceId: device.id, completed: true },
        orderBy: { date: "desc" },
        select: { date: true },
      });
      const cursor = new Date();
      if (!allLogs.some((l) => l.date === today)) cursor.setDate(cursor.getDate() - 1);
      while (allLogs.some((l) => l.date === todayStr(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }
    }

    // Award XP: +10 for the step, +50 bonus if the ritual just completed
    const justCompleted = data.completed && !(existing?.completed);
    let xpAmount = XP_REWARDS.ritualStep;
    if (justCompleted) xpAmount += XP_REWARDS.ritualCompleteBonus;
    const xpResult = await awardXp(device.id, xpAmount);

    return NextResponse.json({
      log: {
        step1Cleanse: log.step1Cleanse,
        step2Manifest: log.step2Manifest,
        step3Tarot: log.step3Tarot,
        step4Balance: log.step4Balance,
        completed: log.completed,
      },
      justCompleted,
      streak,
      xp: xpResult,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
