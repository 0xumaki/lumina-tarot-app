import { NextResponse } from "next/server";
import { requireDevice } from "@/lib/device";
import { db } from "@/lib/db";
import { todayStr } from "@/lib/limits";
import {
  generatePositivityScript,
  detectCategory,
  POSITIVITY_CATEGORIES,
  type PositivityCategory,
} from "@/lib/positivity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Free tier: 1 positivity session per day. Premium: unlimited. */
const FREE_DAILY_LIMIT = 1;

/** Format a date as YYYY-MM-DD string (local, for streak calculation). */
function dateToStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * GET /api/positivity — returns categories + today's usage.
 */
export async function GET(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const today = todayStr();

    // Count today's sessions from UsageLog (we store it as part of tarotReadings-like counter)
    // For simplicity, we track positivity sessions in a separate counter on the UsageLog
    // But since we can't add columns easily, we'll use a simple approach: check the UsageLog
    const usage = await db.usageLog.findUnique({
      where: { deviceId_date: { deviceId: device.id, date: today } },
    });

    // We'll use the frequencySec field as a proxy: if > 0, user has done a session today
    // Actually, let's use a simpler approach — track via a localStorage counter on the client
    // and enforce server-side via the usage log's frequencySec (repurposed) or a new field.
    // For now, we'll track sessions via the UsageLog.frequencySec as a hack (0 = no session, >0 = has session)
    // Better: add a `positivitySessions` field to UsageLog. But that requires migration.
    // Simplest: use a separate PositivitySession model.
    const sessionsToday = await db.positivitySession.count({
      where: { deviceId: device.id, date: today },
    }).catch(() => 0);

    const remaining = device.isPremium ? Infinity : Math.max(0, FREE_DAILY_LIMIT - sessionsToday);

    // Calculate positivity streak (consecutive days with at least 1 session)
    let positivityStreak = 0;
    try {
      const allSessions = await db.positivitySession.findMany({
        where: { deviceId: device.id },
        select: { date: true },
        distinct: ["date"],
        orderBy: { date: "desc" },
      });

      const sessionDates = new Set(allSessions.map((s) => s.date));
      const cursor = new Date();
      if (!sessionDates.has(dateToStr(cursor))) {
        cursor.setDate(cursor.getDate() - 1);
      }
      while (sessionDates.has(dateToStr(cursor))) {
        positivityStreak++;
        cursor.setDate(cursor.getDate() - 1);
      }
    } catch {}

    return NextResponse.json({
      categories: POSITIVITY_CATEGORIES.map((c) => ({
        id: c.id,
        label: c.label,
        glyph: c.glyph,
        color: c.color,
        desc: c.desc,
      })),
      usage: {
        sessionsToday,
        remaining: remaining === Infinity ? null : remaining,
        isPremium: device.isPremium,
        limit: FREE_DAILY_LIMIT,
        positivityStreak,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Failed." },
      { status: 400 }
    );
  }
}

/**
 * POST /api/positivity — generate a positivity script.
 * Body: { category?: PositivityCategory, intention?: string }
 * If intention is empty but category is provided, uses template defaults (quick-start).
 */
export async function POST(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const body = await req.json().catch(() => ({}));
    const { category, intention, durationSec } = body as {
      category?: PositivityCategory;
      intention?: string;
      durationSec?: number;
    };

    // Either category or intention must be provided
    if (!category && !intention?.trim()) {
      return NextResponse.json(
        { error: "Please choose a category or share your intention." },
        { status: 400 }
      );
    }

    if (intention && intention.length > 500) {
      return NextResponse.json(
        { error: "Please keep your intention under 500 characters." },
        { status: 400 }
      );
    }

    // Validate duration (1-5 minutes = 60-300 seconds)
    const validDuration = durationSec && durationSec >= 60 && durationSec <= 300 ? durationSec : undefined;

    // Check daily limit for free users
    const today = todayStr();
    const sessionsToday = await db.positivitySession.count({
      where: { deviceId: device.id, date: today },
    }).catch(() => 0);

    if (!device.isPremium && sessionsToday >= FREE_DAILY_LIMIT) {
      return NextResponse.json(
        {
          error: "limit-reached",
          message: "You've used your free positivity session for today. Come back tomorrow or upgrade to Premium for unlimited sessions.",
          usage: { sessionsToday, limit: FREE_DAILY_LIMIT, isPremium: false },
        },
        { status: 429 }
      );
    }

    // Detect or use provided category
    const resolvedCategory = category && POSITIVITY_CATEGORIES.some((c) => c.id === category)
      ? category
      : detectCategory(intention || "");

    const script = await generatePositivityScript(resolvedCategory, intention || "", validDuration);

    // Get the frequency for this category
    const catMeta = POSITIVITY_CATEGORIES.find((c) => c.id === resolvedCategory);
    const frequencyHz = catMeta?.frequencyHz || 528;
    const frequencyName = catMeta?.frequencyName || "Miracle Healing";

    // Log the session
    try {
      await db.positivitySession.create({
        data: {
          deviceId: device.id,
          date: today,
          category: resolvedCategory,
          intention: intention?.trim() || null,
          durationSec: script.totalDurationSec,
          source: script.source,
        },
      });
    } catch (e) {
      console.error("Failed to log positivity session:", e);
    }

    // Calculate positivity streak (consecutive days with at least 1 session)
    let positivityStreak = 0;
    try {
      const allSessions = await db.positivitySession.findMany({
        where: { deviceId: device.id },
        select: { date: true },
        distinct: ["date"],
        orderBy: { date: "desc" },
      });

      const sessionDates = new Set(allSessions.map((s) => s.date));
      const cursor = new Date();
      // If today not in set, start from yesterday
      if (!sessionDates.has(dateToStr(cursor))) {
        cursor.setDate(cursor.getDate() - 1);
      }
      while (sessionDates.has(dateToStr(cursor))) {
        positivityStreak++;
        cursor.setDate(cursor.getDate() - 1);
      }
    } catch {}

    return NextResponse.json({
      script,
      frequency: { hz: frequencyHz, name: frequencyName },
      usage: {
        sessionsToday: sessionsToday + 1,
        remaining: device.isPremium ? null : Math.max(0, FREE_DAILY_LIMIT - sessionsToday - 1),
        isPremium: device.isPremium,
        limit: FREE_DAILY_LIMIT,
        positivityStreak,
      },
    });
  } catch (e: any) {
    console.error("positivity API error:", e);
    return NextResponse.json(
      { error: e.message || "Failed to generate script." },
      { status: 500 }
    );
  }
}
