import { NextResponse } from "next/server";
import { requireDevice } from "@/lib/device";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/feedback — submit thumbs up/down on an AI insight.
 * Body: { type: "energy_signature" | "weekly_reflection", rating: "up" | "down", note?: string }
 */
export async function POST(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const body = await req.json().catch(() => ({}));
    const { type, rating, note } = body as {
      type?: string;
      rating?: string;
      note?: string;
    };

    if (!type || !["energy_signature", "weekly_reflection"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    if (!rating || !["up", "down"].includes(rating)) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    const feedback = await db.insightFeedback.create({
      data: {
        deviceId: device.id,
        type,
        rating,
        note: note?.trim() || null,
      },
    });

    return NextResponse.json({ feedback });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
