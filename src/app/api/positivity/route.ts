import { NextResponse } from "next/server";
import { requireDevice } from "@/lib/device";
import {
  generatePositivityScript,
  detectCategory,
  POSITIVITY_CATEGORIES,
  type PositivityCategory,
} from "@/lib/positivity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/positivity — returns the list of positivity categories.
 */
export async function GET() {
  return NextResponse.json({
    categories: POSITIVITY_CATEGORIES.map((c) => ({
      id: c.id,
      label: c.label,
      glyph: c.glyph,
      color: c.color,
      desc: c.desc,
    })),
  });
}

/**
 * POST /api/positivity — generate a positivity script.
 * Body: { category?: PositivityCategory, intention: string }
 * If category is not provided, it's auto-detected from the intention text.
 */
export async function POST(req: Request) {
  try {
    const device = await requireDevice(new Headers(req.headers));
    const body = await req.json().catch(() => ({}));
    const { category, intention } = body as {
      category?: PositivityCategory;
      intention?: string;
    };

    if (!intention || !intention.trim()) {
      return NextResponse.json(
        { error: "Please share what you'd like to generate positivity for." },
        { status: 400 }
      );
    }

    if (intention.length > 500) {
      return NextResponse.json(
        { error: "Please keep your intention under 500 characters." },
        { status: 400 }
      );
    }

    // Detect or use provided category
    const resolvedCategory = category && POSITIVITY_CATEGORIES.some((c) => c.id === category)
      ? category
      : detectCategory(intention);

    const script = await generatePositivityScript(resolvedCategory, intention);

    return NextResponse.json({
      script,
      device: { id: device.id },
    });
  } catch (e: any) {
    console.error("positivity API error:", e);
    return NextResponse.json(
      { error: e.message || "Failed to generate script." },
      { status: 500 }
    );
  }
}
