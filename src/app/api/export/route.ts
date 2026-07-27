import { NextResponse } from "next/server";
import { requireDevice } from "@/lib/device";
import { db } from "@/lib/db";
import { TAROT_DECK } from "@/lib/tarot-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/export — export all user data as JSON.
 * Returns readings, goals, confirmations, frequency sessions, moods.
 */
export async function GET(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));

    const [readings, goals, confirmations, sessions, moods] = await Promise.all([
      db.reading.findMany({
        where: { deviceId: device.id },
        orderBy: { createdAt: "desc" },
        select: {
          question: true,
          spreadType: true,
          cardsJson: true,
          interpretation: true,
          saved: true,
          createdAt: true,
        },
      }),
      db.goal.findMany({
        where: { deviceId: device.id },
        orderBy: { createdAt: "desc" },
        select: {
          title: true,
          intention: true,
          statement: true,
          reminderTime: true,
          status: true,
          createdAt: true,
        },
      }),
      db.confirmation.findMany({
        where: { deviceId: device.id },
        orderBy: { date: "desc" },
        select: { date: true, note: true, createdAt: true },
      }),
      db.frequencySession.findMany({
        where: { deviceId: device.id },
        orderBy: { createdAt: "desc" },
        select: { intention: true, frequencyHz: true, mode: true, durationSec: true, completed: true, createdAt: true },
      }),
      db.mood.findMany({
        where: { deviceId: device.id },
        orderBy: { date: "desc" },
        select: { date: true, mood: true, note: true },
      }),
    ]);

    // Enrich readings with card names
    const enrichedReadings = readings.map((r) => {
      let cards: { id: string; reversed: boolean; position?: string }[] = [];
      try { cards = JSON.parse(r.cardsJson); } catch {}
      return {
        ...r,
        cardsJson: undefined,
        cards: cards.map((c) => {
          const card = TAROT_DECK.find((t) => t.id === c.id);
          return {
            name: card?.name ?? c.id,
            reversed: c.reversed,
            position: c.position,
          };
        }),
      };
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      device: {
        isPremium: device.isPremium,
        memberSince: device.createdAt,
      },
      stats: {
        totalReadings: readings.length,
        totalGoals: goals.length,
        totalConfirmations: confirmations.length,
        totalFrequencySessions: sessions.length,
        totalMoodEntries: moods.length,
      },
      readings: enrichedReadings,
      goals,
      confirmations,
      frequencySessions: sessions,
      moods,
    };

    return NextResponse.json(exportData);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
