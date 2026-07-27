import { NextResponse } from "next/server";
import { requireDevice } from "@/lib/device";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/stats/weekly — LLM-generated weekly reflection digest.
 * Combines mood + readings + goals + frequency from the last 7 days into
 * a single reflective narrative. Available to all users (free + premium).
 */

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push(localDateStr(d));
    }

    const [readings, confirmations, sessions, moods, goals] = await Promise.all([
      db.reading.findMany({
        where: { deviceId: device.id, spreadType: { not: "card-of-day" }, createdAt: { gte: weekStart } },
        select: { question: true, spreadType: true, createdAt: true },
      }),
      db.confirmation.findMany({
        where: { deviceId: device.id, date: { in: days } },
        select: { date: true },
      }),
      db.frequencySession.findMany({
        where: { deviceId: device.id, createdAt: { gte: weekStart } },
        select: { intention: true, durationSec: true },
      }),
      db.mood.findMany({
        where: { deviceId: device.id, date: { in: days } },
        select: { date: true, mood: true, note: true },
      }),
      db.goal.findMany({
        where: { deviceId: device.id, status: "active" },
        select: { title: true, intention: true },
      }),
    ]);

    // If no activity at all, return empty
    if (readings.length === 0 && confirmations.length === 0 && sessions.length === 0 && moods.length === 0) {
      return NextResponse.json({ reflection: null, reason: "no-activity" });
    }

    // Build summary
    const moodValues = moods.map((m) => m.mood);
    const moodAvg = moodValues.length > 0 ? (moodValues.reduce((a, b) => a + b, 0) / moodValues.length).toFixed(1) : null;
    const moodTrend = moodValues.length >= 2 ? (moodValues[moodValues.length - 1] > moodValues[0] ? "rising" : moodValues[moodValues.length - 1] < moodValues[0] ? "falling" : "steady") : null;

    const freqMinutes = Math.round(sessions.reduce((s, x) => s + x.durationSec, 0) / 60);
    const intentionCounts = new Map<string, number>();
    for (const s of sessions) {
      intentionCounts.set(s.intention, (intentionCounts.get(s.intention) ?? 0) + 1);
    }
    const topIntentions = [...intentionCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);

    const recentQuestions = readings.slice(0, 3).map((r) => r.question);

    const summary = `This week (last 7 days):
- Tarot: ${readings.length} readings. Questions: ${recentQuestions.length > 0 ? recentQuestions.map((q) => `"${q.slice(0, 60)}"`).join(", ") : "none"}
- Manifestation: ${confirmations.length} confirmations across ${goals.length} active goals. Goals: ${goals.length > 0 ? goals.map((g) => g.title).join(", ") : "none"}
- Frequencies: ${freqMinutes} min, ${sessions.length} sessions. Top intentions: ${topIntentions.length > 0 ? topIntentions.join(", ") : "none"}
- Mood: ${moodAvg ? `avg ${moodAvg}/5, trend ${moodTrend}, ${moods.length} days logged` : "not logged"}${moods.some((m) => m.note) ? `. Notes: ${moods.filter((m) => m.note).map((m) => `"${m.note}"`).join(", ")}` : ""}`;

    const system = `You are Lumina, a reflective guide who writes a Sunday-evening-style weekly digest for a tarot/manifestation app user.
Your voice is warm, poetic, and honest — like a wise friend summarizing the week's arc.
Write 3-4 sentences that weave together the user's tarot questions, manifestation practice, frequency use, and mood into a single coherent reflection.
Name the week's theme (one evocative phrase). Acknowledge what they did. Offer one gentle insight or invitation for the coming week.
No filler. No disclaimers. No lists. Just flowing prose.`;

    const userPrompt = `${summary}\n\nWrite the weekly reflection now. Start with the theme as a short title.`;

    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.85,
        maxTokens: 220,
      });
      const text = completion.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("Empty LLM response");

      // Parse theme (first line or **bold**)
      const lines = text.split("\n").filter((l) => l.trim());
      const themeMatch = lines[0]?.match(/\*\*([^*]+)\*\*/) || lines[0]?.match(/^(.{1,50})$/);
      const theme = themeMatch ? themeMatch[1].replace(/\*\*/g, "").trim() : "Your week";
      const body = lines.slice(themeMatch ? 1 : 0).join(" ").trim();

      return NextResponse.json({
        reflection: {
          theme,
          body: body || text,
          weekRange: `${days[0]} to ${days[6]}`,
          stats: {
            readings: readings.length,
            confirmations: confirmations.length,
            frequencyMin: freqMinutes,
            moodAvg,
            moodDays: moods.length,
          },
        },
      });
    } catch (llmErr) {
      console.error("Weekly reflection LLM failed:", llmErr);
      return NextResponse.json({ reflection: null, reason: "llm-failed" });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
