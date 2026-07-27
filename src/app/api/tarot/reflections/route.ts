import { NextResponse } from "next/server";
import { requireDevice } from "@/lib/device";
import { db } from "@/lib/db";
import { TAROT_DECK } from "@/lib/tarot-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tarot/reflections — past Card-of-the-Day reflections.
 * Returns the most recent 30 card-of-day readings with their reflection text.
 */
export async function GET(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));

    const reflections = await db.reading.findMany({
      where: { deviceId: device.id, spreadType: "card-of-day" },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const items = reflections
      .map((r) => {
        let cardData: { id: string; reversed: boolean } | null = null;
        try {
          const parsed = JSON.parse(r.cardsJson);
          cardData = Array.isArray(parsed) ? parsed[0] : null;
        } catch {}
        if (!cardData) return null;
        const card = TAROT_DECK.find((c) => c.id === cardData!.id);
        if (!card) return null;
        return {
          id: r.id,
          date: r.createdAt,
          card,
          reversed: cardData.reversed,
          reflection: r.question, // stored in question field
          affirmation: card.affirmation,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ reflections: items });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
