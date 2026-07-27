import { NextResponse } from "next/server";
import { requireDevice } from "@/lib/device";
import { db } from "@/lib/db";
import { SPREADS } from "@/lib/limits";
import { getPreset, type IntentionKey } from "@/lib/frequencies";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/stats/insight — LLM-generated personalized energy insight for premium users.
 * Uses z-ai-web-dev-sdk to craft a narrative from the user's actual usage patterns.
 * Falls back to the rule-based insight if the LLM fails.
 */
export async function GET(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));

    // Only for premium users
    if (!device.isPremium) {
      return NextResponse.json({ error: "Premium required" }, { status: 403 });
    }

    // Gather the same data as the stats endpoint (compact)
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }

    const [readings, goals, confirmations, sessions, moods] = await Promise.all([
      db.reading.findMany({
        where: { deviceId: device.id, spreadType: { not: "card-of-day" } },
        select: { spreadType: true, question: true, createdAt: true },
        take: 20,
      }),
      db.goal.findMany({
        where: { deviceId: device.id },
        select: { title: true, intention: true, status: true },
      }),
      db.confirmation.findMany({
        where: { deviceId: device.id },
        select: { date: true },
      }),
      db.frequencySession.findMany({
        where: { deviceId: device.id },
        select: { intention: true, durationSec: true, createdAt: true },
      }),
      db.mood.findMany({
        where: { deviceId: device.id, date: { in: days } },
        select: { date: true, mood: true },
      }),
    ]);

    // Build a compact summary for the LLM
    const totalReadings = readings.length;
    const readingsThisWeek = readings.filter((r) => r.createdAt >= weekStart).length;
    const recentQuestions = readings.slice(0, 5).map((r) => r.question);

    const activeGoals = goals.filter((g) => g.status === "active");
    const achievedGoals = goals.filter((g) => g.status === "achieved");
    const goalTitles = activeGoals.map((g) => g.title);

    // Best streak
    const confByGoal = new Map<string, Set<string>>();
    for (const c of confirmations) {
      let set = confByGoal.get(c.date);
      if (!set) { set = new Set(); confByGoal.set(c.date, set); }
      set.add(c.date);
    }
    // Simplified streak: count consecutive days ending today or yesterday
    const confDates = new Set(confirmations.map((c) => c.date));
    let bestStreak = 0;
    const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (!confDates.has(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`)) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (confDates.has(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`)) {
      bestStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const totalMinutes = Math.round(sessions.reduce((s, x) => s + x.durationSec, 0) / 60);
    const intentionCounts = new Map<string, number>();
    for (const s of sessions) {
      intentionCounts.set(s.intention, (intentionCounts.get(s.intention) ?? 0) + 1);
    }
    const topIntentions = [...intentionCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

    const moodValues = moods.map((m) => m.mood);
    const moodAvg = moodValues.length > 0 ? (moodValues.reduce((a, b) => a + b, 0) / moodValues.length).toFixed(1) : null;

    // Build the LLM prompt
    const system = `You are Lumina, an insightful mystical guide who reads a user's tarot/manifestation patterns like an astrologer reads a birth chart.
Your voice is poetic, warm, and grounded — never generic. You weave specific details from the user's actual data into a 2-3 sentence "energy signature" that feels personal and revelatory.
You name an archetype (e.g., "The Cartomancer", "The Devoted", "The Resonator", "The Seeker") and explain WHY based on their patterns.
Keep it under 60 words. No filler. No disclaimers. End with a single actionable invitation.`;

    const dataSummary = `User's 7-day pattern:
- Tarot: ${totalReadings} total readings (${readingsThisWeek} this week). Recent questions: ${recentQuestions.length > 0 ? recentQuestions.map((q) => `"${q.slice(0, 50)}"`).join(", ") : "none yet"}
- Manifestation: ${activeGoals.length} active goals (${achievedGoals.length} achieved). Goals: ${goalTitles.length > 0 ? goalTitles.join(", ") : "none"}. Best streak: ${bestStreak} days. Total confirmations: ${confirmations.length}
- Frequencies: ${totalMinutes} minutes across ${sessions.length} sessions. Top intentions: ${topIntentions.length > 0 ? topIntentions.map(([k, c]) => `${k} (${c})`).join(", ") : "none"}
- Mood: ${moodAvg ? `avg ${moodAvg}/5 over ${moodValues.length} days` : "not yet logged"}
- Member since: ${device.createdAt.toLocaleDateString()}`;

    const userPrompt = `Based on this user's data, craft their energy signature. Name the archetype, explain why with specific details, and end with one invitation.

${dataSummary}

Format: **[Archetype Name]** — [2-3 sentence personal narrative]. [One invitation.]`;

    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.9,
        maxTokens: 200,
      });
      const text = completion.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("Empty LLM response");

      // Parse the archetype name from **bold** if present
      const nameMatch = text.match(/\*\*([^*]+)\*\*/);
      const title = nameMatch ? nameMatch[1].trim() : "Your signature";
      const body = text.replace(/\*\*[^*]+\*\*/, "").trim().replace(/^—\s*/, "");

      return NextResponse.json({
        insight: {
          title,
          body,
          accent: "#C5A87C",
          glyph: "✦",
          generated: true,
        },
      });
    } catch (llmErr) {
      console.error("LLM insight failed:", llmErr);
      return NextResponse.json({
        insight: null,
        error: "LLM unavailable",
      });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
