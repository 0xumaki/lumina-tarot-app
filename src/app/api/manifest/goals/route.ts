import { NextResponse } from "next/server";
import { requireDevice } from "@/lib/device";
import { db } from "@/lib/db";
import { detectIntention } from "@/lib/frequencies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/manifest/goals — list goals with confirmation stats. */
export async function GET(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const goals = await db.goal.findMany({
      where: { deviceId: device.id, status: { in: ["active", "achieved"] } },
      orderBy: { createdAt: "desc" },
      include: { confirmations: { orderBy: { date: "desc" }, take: 60 } },
    });

    const today = new Date().toISOString().slice(0, 10);
    const items = goals.map((g) => {
      const sorted = [...g.confirmations].sort((a, b) =>
        a.date < b.date ? 1 : -1
      );
      // streak = consecutive days ending today (or yesterday)
      let streak = 0;
      const dates = new Set(g.confirmations.map((c) => c.date));
      const d = new Date();
      // allow streak to count from today or yesterday
      const todayStr = d.toISOString().slice(0, 10);
      if (!dates.has(todayStr)) {
        d.setDate(d.getDate() - 1);
      }
      while (dates.has(d.toISOString().slice(0, 10))) {
        streak++;
        d.setDate(d.getDate() - 1);
      }
      return {
        id: g.id,
        title: g.title,
        intention: g.intention,
        statement: g.statement,
        reminderTime: g.reminderTime,
        targetDate: g.targetDate,
        frequencyHz: g.frequencyHz,
        status: g.status,
        createdAt: g.createdAt,
        confirmedToday: g.confirmations.some((c) => c.date === today),
        streak,
        totalConfirmations: g.confirmations.length,
      };
    });

    return NextResponse.json({ goals: items, isPremium: device.isPremium });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 400 });
  }
}

/** POST /api/manifest/goals — create a goal. Free = 1 active goal. */
export async function POST(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const body = await req.json().catch(() => ({}));
    const { title, statement, reminderTime, targetDate } = body as {
      title?: string;
      statement?: string;
      reminderTime?: string;
      targetDate?: string;
    };

    if (!title || !title.trim() || !statement || !statement.trim()) {
      return NextResponse.json(
        { error: "Title and statement are required." },
        { status: 400 }
      );
    }
    if (!reminderTime || !/^\d{2}:\d{2}$/.test(reminderTime)) {
      return NextResponse.json(
        { error: "A reminder time (HH:mm) is required." },
        { status: 400 }
      );
    }

    // Free limit: 1 active goal
    const activeCount = await db.goal.count({
      where: { deviceId: device.id, status: "active" },
    });
    if (!device.isPremium && activeCount >= 1) {
      return NextResponse.json(
        {
          error: "limit-reached",
          message:
            "Free tier supports one active manifestation goal. Achieve or archive it, or upgrade to Premium for unlimited goals.",
        },
        { status: 429 }
      );
    }

    // Auto-detect intention + frequency from the statement
    const preset = detectIntention(`${title} ${statement}`);

    const goal = await db.goal.create({
      data: {
        deviceId: device.id,
        title: title.trim(),
        intention: preset.key,
        statement: statement.trim(),
        reminderTime,
        targetDate: targetDate ? new Date(targetDate) : null,
        frequencyHz: preset.carrierHz,
        status: "active",
      },
    });

    return NextResponse.json({
      goal: {
        ...goal,
        detectedIntention: preset,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}

/** PATCH /api/manifest/goals — update status / fields. */
export async function PATCH(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const body = await req.json().catch(() => ({}));
    const { id, status, reminderTime, statement, title } = body as {
      id: string;
      status?: "active" | "achieved" | "archived";
      reminderTime?: string;
      statement?: string;
      title?: string;
    };
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await db.goal.findFirst({ where: { id, deviceId: device.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await db.goal.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(reminderTime && { reminderTime }),
        ...(statement && { statement }),
        ...(title && { title }),
      },
    });
    return NextResponse.json({ goal: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}

/** DELETE /api/manifest/goals?id=... */
export async function DELETE(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await db.goal.findFirst({ where: { id, deviceId: device.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.goal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
