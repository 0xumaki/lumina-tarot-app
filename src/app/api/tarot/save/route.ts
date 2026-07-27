import { NextResponse } from "next/server";
import { requireDevice } from "@/lib/device";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/tarot/save — toggle the saved (bookmark) state on a reading.
 * Body: { readingId: string }
 */
export async function POST(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const body = await req.json().catch(() => ({}));
    const { readingId } = body as { readingId?: string };
    if (!readingId) {
      return NextResponse.json({ error: "readingId required" }, { status: 400 });
    }

    const reading = await db.reading.findFirst({
      where: { id: readingId, deviceId: device.id },
      select: { id: true, saved: true },
    });
    if (!reading) {
      return NextResponse.json({ error: "Reading not found" }, { status: 404 });
    }

    const updated = await db.reading.update({
      where: { id: readingId },
      data: { saved: !reading.saved },
      select: { id: true, saved: true },
    });

    return NextResponse.json({ reading: updated });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
