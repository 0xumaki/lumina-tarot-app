import { NextResponse } from "next/server";
import { requireDevice } from "@/lib/device";
import {
  SPREADS,
  canUseSpread,
  getSpread,
  todayStr,
  incrementTarotUsage,
  getOrCreateUsage,
  remainingTarotReadings,
  type SpreadType,
} from "@/lib/limits";
import { drawCards, attachMeta } from "@/lib/tarot";
import { interpretReading } from "@/lib/ai-tarot";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/tarot/read — return available spreads + usage info (for the UI). */
export async function GET() {
  return NextResponse.json({ spreads: SPREADS });
}

/** POST /api/tarot/read — perform a reading. */
export async function POST(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const body = await req.json().catch(() => ({}));
    const { question, spreadType } = body as {
      question?: string;
      spreadType?: SpreadType;
    };

    if (!question || !question.trim()) {
      return NextResponse.json({ error: "Please enter a question." }, { status: 400 });
    }
    if (!spreadType || !getSpread(spreadType)) {
      return NextResponse.json({ error: "Invalid spread." }, { status: 400 });
    }

    // Premium gating
    if (!canUseSpread(device.isPremium, spreadType)) {
      return NextResponse.json(
        {
          error: "premium-required",
          message: `${getSpread(spreadType)!.name} is a Premium spread. Upgrade to unlock all spreads.`,
        },
        { status: 402 }
      );
    }

    // Free daily limit
    const date = todayStr();
    const usage = await getOrCreateUsage(device.id, date);
    const remaining = remainingTarotReadings(device.isPremium, usage.tarotReadings);
    if (remaining <= 0) {
      return NextResponse.json(
        {
          error: "limit-reached",
          message:
            "You've used your 2 free questions today. Come back tomorrow or upgrade to Premium for unlimited readings.",
        },
        { status: 429 }
      );
    }

    const spread = getSpread(spreadType)!;
    const drawn = drawCards(spread.cardCount, spread.positions);
    const drawnWithMeta = attachMeta(drawn);

    // AI interpretation
    const interpretation = await interpretReading(
      question,
      spreadType,
      drawnWithMeta,
      device.isPremium
    );

    // Persist (sequential — incrementTarotUsage is an async wrapper, not a PrismaPromise)
    const reading = await db.reading.create({
      data: {
        deviceId: device.id,
        question: question.trim(),
        spreadType,
        cardsJson: JSON.stringify(drawn),
        interpretation,
        isPremium: device.isPremium,
      },
    });
    await incrementTarotUsage(device.id, date);

    return NextResponse.json({
      reading: {
        id: reading.id,
        question: reading.question,
        spreadType: reading.spreadType,
        cards: drawnWithMeta.map((d) => ({
          id: d.id,
          reversed: d.reversed,
          position: d.position,
          card: d.card,
        })),
        interpretation,
        createdAt: reading.createdAt,
      },
      usage: {
        remaining: remainingTarotReadings(
          device.isPremium,
          usage.tarotReadings + 1
        ),
      },
    });
  } catch (e: any) {
    console.error("tarot/read error:", e);
    return NextResponse.json(
      { error: e.message || "Something went wrong." },
      { status: 500 }
    );
  }
}
