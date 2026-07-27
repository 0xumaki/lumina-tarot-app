import { NextResponse } from "next/server";
import { requireDevice } from "@/lib/device";
import { todayStr, remainingTarotReadings } from "@/lib/limits";
import { getOrCreateUsage } from "@/lib/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/me — current device, premium status, and today's usage. */
export async function GET(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const date = todayStr();
    const usage = await getOrCreateUsage(device.id, date);
    const remaining = remainingTarotReadings(device.isPremium, usage.tarotReadings);

    const { db } = await import("@/lib/db");
    const activeGoals = await db.goal.count({
      where: { deviceId: device.id, status: "active" },
    });
    const confirmedToday = await db.confirmation.count({
      where: { deviceId: device.id, date },
    });

    return NextResponse.json({
      device: {
        id: device.id,
        deviceId: device.deviceId,
        displayName: device.displayName,
        isPremium: device.isPremium,
        premiumSince: device.premiumSince,
        createdAt: device.createdAt,
      },
      usage: {
        date,
        tarotReadings: usage.tarotReadings,
        remainingTarot: remaining === Infinity ? null : remaining,
        frequencySec: usage.frequencySec,
        activeGoals,
        confirmedToday,
      },
      limits: device.isPremium
        ? {
            tarotReadingsPerDay: null,
            manifestGoals: null,
            frequencySecondsPerSession: null,
          }
        : {
            tarotReadingsPerDay: 2,
            manifestGoals: 1,
            frequencySecondsPerSession: 30,
          },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 400 });
  }
}

/** PATCH /api/me — toggle premium (mock), set display name. */
export async function PATCH(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const body = await req.json().catch(() => ({}));
    const { isPremium, displayName } = body as {
      isPremium?: boolean;
      displayName?: string;
    };
    const { db } = await import("@/lib/db");
    const updated = await db.device.update({
      where: { id: device.id },
      data: {
        ...(typeof isPremium === "boolean" && {
          isPremium,
          premiumSince: isPremium ? new Date() : null,
        }),
        ...(typeof displayName === "string" && { displayName }),
      },
    });
    return NextResponse.json({
      device: {
        id: updated.id,
        deviceId: updated.deviceId,
        displayName: updated.displayName,
        isPremium: updated.isPremium,
        premiumSince: updated.premiumSince,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 400 });
  }
}
