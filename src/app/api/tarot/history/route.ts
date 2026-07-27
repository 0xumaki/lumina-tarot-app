import { NextResponse } from "next/server";
import { requireDevice } from "@/lib/device";
import { db } from "@/lib/db";
import { TAROT_DECK } from "@/lib/tarot-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/tarot/history — recent readings for this device. */
export async function GET(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 10), 50);

    const readings = await db.reading.findMany({
      where: { deviceId: device.id },
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
