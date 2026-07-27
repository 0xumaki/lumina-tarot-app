import { NextResponse } from "next/server";
import { requireDevice } from "@/lib/device";
import { db } from "@/lib/db";
import { TAROT_DECK } from "@/lib/tarot-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deterministic "Card of the Day" — same card for a given device on a given day.
 * Uses a seed from (deviceId hash + date) to pick from the 78-card deck.
 * Persisted so the user sees the same card all day, with an optional reflection note.
 */

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** GET /api/tarot/card-of-day — returns today's card + any saved reflection. */
export async function GET(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const date = todayStr();
    const seed = hashSeed(device.deviceId + date);
    const idx = seed % TAROT_DECK.length;
    const card = TAROT_DECK[idx];
    const reversed = (Math.floor(seed / TAROT_DECK.length) % 100) < 38;

    // Check for a saved reflection (stored as a Reading with spreadType "card-of-day")
    const existing = await db.reading.findFirst({
      where: {
        deviceId: device.id,
        spreadType: "card-of-day",
        createdAt: { gte: new Date(date + "T00:00:00.000Z") },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      date,
      card,
      reversed,
      reflection: existing?.question ?? null, // reuse question field for the reflection text
      reflectionId: existing?.id ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 400 });
  }
}

/** POST /api/tarot/card-of-day — save or update a reflection note. */
export async function POST(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const body = await req.json().catch(() => ({}));
    const { reflection } = body as { reflection?: string };
    if (!reflection || !reflection.trim()) {
      return NextResponse.json({ error: "Reflection required" }, { status: 400 });
    }

    const date = todayStr();
    const seed = hashSeed(device.deviceId + date);
    const idx = seed % TAROT_DECK.length;
    const card = TAROT_DECK[idx];
    const reversed = (Math.floor(seed / TAROT_DECK.length) % 100) < 38;

    // Upsert: if a reading exists for today with card-of-day, update it
    const existing = await db.reading.findFirst({
      where: {
        deviceId: device.id,
        spreadType: "card-of-day",
        createdAt: { gte: new Date(date + "T00:00:00.000Z") },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      const updated = await db.reading.update({
        where: { id: existing.id },
        data: { question: reflection.trim() },
      });
      return NextResponse.json({ reading: updated, saved: true });
    }

    const reading = await db.reading.create({
      data: {
        deviceId: device.id,
        question: reflection.trim(),
        spreadType: "card-of-day",
        cardsJson: JSON.stringify([{ id: card.id, reversed }]),
        interpretation: card.affirmation,
        isPremium: device.isPremium,
      },
    });
    return NextResponse.json({ reading, saved: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
