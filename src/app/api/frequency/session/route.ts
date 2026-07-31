import { NextResponse } from "next/server";
import { requireDevice } from "@/lib/device";
import { db } from "@/lib/db";
import { addFrequencyUsage, getOrCreateUsage, todayStr } from "@/lib/limits";
import { awardXp, xpForFrequency } from "@/lib/xp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/frequency/session — log a frequency listening session. */
export async function POST(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const body = await req.json().catch(() => ({}));
    const {
      intention,
      frequencyHz,
      baseHz,
      beatHz,
      mode,
      durationSec,
      completed,
    } = body as {
      intention: string;
      frequencyHz: number;
      baseHz?: number;
      beatHz?: number;
      mode: string;
      durationSec: number;
      completed?: boolean;
    };

    if (!intention || !frequencyHz || !durationSec) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const date = todayStr();
    await getOrCreateUsage(device.id, date);

    const session = await db.frequencySession.create({
      data: {
        deviceId: device.id,
        intention,
        frequencyHz,
        baseHz: baseHz || null,
        beatHz: beatHz || null,
        mode,
        durationSec,
        completed: !!completed,
      },
    });

    await addFrequencyUsage(device.id, date, durationSec);

    // Award XP based on session duration
    const xpResult = await awardXp(device.id, xpForFrequency(durationSec));

    return NextResponse.json({ session, xp: xpResult });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}

/** GET /api/frequency/session — recent sessions. */
export async function GET(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const sessions = await db.frequencySession.findMany({
      where: { deviceId: device.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return NextResponse.json({ sessions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 400 });
  }
}
