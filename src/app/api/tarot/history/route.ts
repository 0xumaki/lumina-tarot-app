import { NextResponse } from "next/server";
import { requireDevice } from "@/lib/device";
import { db } from "@/lib/db";
import { TAROT_DECK } from "@/lib/tarot-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/tarot/history — recent readings for this device.
 *  Query params: limit (default 10), saved ("true" to filter only saved),
 *  exclude ("card-of-day" to exclude card-of-day reflections).
 */
export async function GET(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 10), 50);
    const savedOnly = url.searchParams.get("saved") === "true";

    const readings = await db.reading.findMany({
      where: {
        deviceId: device.id,
        spreadType: { not: "card-of-day" },
        ...(savedOnly ? { saved: true } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const items = readings.map((r) => {
      let cards: { id: string; reversed: boolean; position?: string }[] = [];
      try {
        cards = JSON.parse(r.cardsJson);
      } catch {}
      return {
        id: r.id,
        question: r.question,
        spreadType: r.spreadType,
        interpretation: r.interpretation,
        createdAt: r.createdAt,
        saved: r.saved,
        cards: cards.map((c) => {
          const card = TAROT_DECK.find((t) => t.id === c.id);
          return { ...c, card };
        }),
      };
    });

    return NextResponse.json({ readings: items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 400 });
  }
}
