import ZAI from "z-ai-web-dev-sdk";
import { summarizeDrawn, tallyYesNo, type DrawnCardWithMeta } from "@/lib/tarot";

/**
 * AI tarot interpretation with a 3-tier fallback strategy:
 *
 * Tier 1: OpenRouter FREE models (auto-selected per spread type — no cost)
 * Tier 2: z-ai-web-dev-sdk (existing integration, works without extra keys)
 * Tier 3: Smart template-based interpretation (no LLM — always works)
 *
 * The user never sees which model is used — they just get a reading.
 */

/* ============================================================
   TIER 1: OpenRouter free models
   Auto-selects the best free model for each reading type.
   Requires OPENROUTER_API_KEY env var.
   ============================================================ */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

/** Pick the best free model for the reading type. */
function pickFreeModel(spreadType: string): string {
  // Use larger models for all readings — quality matters more than speed for tarot
  // All are :free variants so they cost $0.
  switch (spreadType) {
    case "yes-no":
      return "nvidia/nemotron-3-nano-30b-a3b:free";
    case "single":
      return "nvidia/nemotron-3-nano-30b-a3b:free";
    case "three-card":
    case "celtic-cross":
    case "relationship":
    case "career":
      return "nvidia/nemotron-3-super-120b-a12b:free";
    case "card-of-day":
      return "nvidia/nemotron-3-nano-30b-a3b:free";
    default:
      return "nvidia/nemotron-3-nano-30b-a3b:free";
  }
}

/** Fallback model list — if the primary free model is unavailable, try these. */
const FREE_MODEL_FALLBACKS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
];

async function tryOpenRouter(
  question: string,
  spreadType: string,
  drawn: DrawnCardWithMeta[],
  isPremium: boolean
): Promise<string | null> {
  if (!OPENROUTER_API_KEY) return null;

  const messages = buildMessages(question, spreadType, drawn, isPremium);
  const primaryModel = pickFreeModel(spreadType);
  const modelsToTry = [primaryModel, ...FREE_MODEL_FALLBACKS.filter((m) => m !== primaryModel)];

  for (const model of modelsToTry) {
    try {
      const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://lumina.app",
          "X-Title": "Lumina Tarot",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.9,
          max_tokens: isPremium ? 2000 : 400,
        }),
        // 40s timeout — larger models are slower but produce better readings
        signal: AbortSignal.timeout(40000),
      });

      if (!res.ok) {
        // Try next model
        continue;
      }

      const data = await res.json();
      const rawText = data?.choices?.[0]?.message?.content?.trim();
      if (rawText && rawText.length > 20) {
        // Sanitize: remove any meta-commentary the LLM might have leaked
        const text = sanitizeReading(rawText);
        if (text && text.length > 20) {
          return text;
        }
      }
    } catch {
      // Network error or timeout — try next model
      continue;
    }
  }

  return null; // All models failed
}

/* ============================================================
   TIER 2: z-ai-web-dev-sdk (existing integration)
   ============================================================ */

async function tryZAI(
  question: string,
  spreadType: string,
  drawn: DrawnCardWithMeta[],
  isPremium: boolean
): Promise<string | null> {
  try {
    const zai = await ZAI.create();
    const messages = buildMessages(question, spreadType, drawn, isPremium);
    const completion = await zai.chat.completions.create({
      messages: messages as any,
      temperature: 0.85,
      maxTokens: isPremium ? 1400 : 220,
    });
    const rawText = completion.choices?.[0]?.message?.content?.trim();
    if (!rawText) return null;
    return sanitizeReading(rawText);
  } catch (err) {
    console.error("z-ai LLM failed:", err);
    return null;
  }
}

/* ============================================================
   SHARED: message builder
   ============================================================ */

function buildMessages(
  question: string,
  spreadType: string,
  drawn: DrawnCardWithMeta[],
  isPremium: boolean
) {
  const summary = summarizeDrawn(drawn);
  const yesNoTally = spreadType === "yes-no" ? tallyYesNo(drawn) : null;

  const system = `You are a master tarot reader. Give ONLY the reading. No commentary about your process.

Forbidden phrases (never output these): "we need to", "I will produce", "thus output", "make sure to", "let me", "let's", "I am going to", "the user asks", "the user says", "we are supposed to", "the system", "the instructions", "here is your reading", "based on the instructions", "following the instructions", "Sentence 1", "Sentence 2", "Sentence 3", "Make sure we don't", "So output", "Must be", "Let's do".

${isPremium
  ? `Give a full tarot reading (400-600 words):
- Acknowledge the question
- For each card: describe the visual symbolism and what it means for this question
- Weave the cards into a cohesive story
- End with guidance and an affirmation`
  : `Give a brief tarot reading (4-6 sentences):
- Acknowledge the question
- Weave the card symbolism into the answer
- End with one sentence of guidance`
}

${spreadType === "yes-no"
  ? "Start with YES, NO, or MAYBE on the first line. Then 2-3 sentences referencing the card's symbolism."
  : ""
}

Speak with warmth and wisdom. Reference visual symbolism (figures, objects, colors). Never break character. Never discuss your reasoning process. The output is the reading itself — nothing else.`;

  let user = `The querent asks: "${question}"

Spread type: ${spreadType}

Cards drawn:
${summary}`;

  if (yesNoTally) {
    user += `

Card-based tally: YES=${yesNoTally.yes}, NO=${yesNoTally.no}, MAYBE=${yesNoTally.maybe}. Suggested: ${yesNoTally.answer.toUpperCase()} (${yesNoTally.confidence}%). Use your own reading to nuance this.`;
  }

  user += `

${isPremium
  ? "Give the full reading now."
  : spreadType === "yes-no"
  ? "Answer with YES, NO, or MAYBE first, then explain why in 2-3 sentences."
  : "Give the reading in 4-6 sentences."
}`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/* ============================================================
   TIER 3: Smart template-based interpretation (no LLM)
   Produces a tailored, context-aware reading using the card data.
   ============================================================ */

function fallbackInterpretation(
  question: string,
  spreadType: string,
  drawn: DrawnCardWithMeta[],
  isPremium: boolean
): string {
  const q = question.trim().toLowerCase();

  if (spreadType === "yes-no") {
    const tally = tallyYesNo(drawn);
    const c = drawn[0].card;
    const orient = drawn[0].reversed ? "reversed" : "upright";
    const meaning = drawn[0].reversed ? c.meaningReversed : c.meaningUpright;
    const confidence =
      tally.confidence >= 75 ? "with clarity" : tally.confidence >= 50 ? "with some nuance" : "tentatively";
    return `${tally.answer.toUpperCase()} — ${confidence}. ${c.name} appears ${orient}, suggesting ${meaning.toLowerCase()} This card speaks directly to your question: the energy you need is already present, though it may ask something of you first.`;
  }

  if (spreadType === "single") {
    const c = drawn[0].card;
    const meaning = drawn[0].reversed ? c.meaningReversed : c.meaningUpright;
    const affirm = c.affirmation;
    return `${c.name} ${drawn[0].reversed ? "(Reversed)" : ""} answers your question. ${meaning} Reflect on this: ${affirm}`;
  }

  // Multi-card spreads (three-card, celtic-cross, relationship, career)
  if (!isPremium) {
    // Concise narrative for free tier
    const cards = drawn.slice(0, 3);
    const opening = craftOpening(cards, q);
    const core = cards
      .map((d) => {
        const meaning = d.reversed ? d.card.meaningReversed : d.card.meaningUpright;
        return meaning.split(".")[0] + ".";
      })
      .join(" ");
    return `${opening} ${core} Trust where this leads you.`;
  }

  // Premium: rich per-card narrative
  const positions = drawn.map((d, i) => {
    const posLabel = d.position || `Position ${i + 1}`;
    const c = d.card;
    const orient = d.reversed ? "Reversed" : "Upright";
    const meaning = d.reversed ? c.meaningReversed : c.meaningUpright;
    const keywords = (d.reversed ? c.keywordsReversed : c.keywordsUpright).slice(0, 3).join(", ");
    return `**${posLabel} — ${c.name} (${orient})**

${meaning}

*Keywords: ${keywords}*`;
  });

  const opening = craftOpening(drawn, q);
  const closing = craftClosing(drawn);
  const affirmation = drawn[0]?.card?.affirmation || "I trust the path unfolding before me.";

  return `${opening}\n\n${positions.join("\n\n")}\n\n${closing}\n\n*✦ Affirmation: "${affirmation}"*`;
}

/** Craft an opening sentence that acknowledges the question + theme. */
function craftOpening(drawn: DrawnCardWithMeta[], question: string): string {
  const themes = new Set<string>();
  drawn.forEach((d) => {
    (d.reversed ? d.card.keywordsReversed : d.card.keywordsUpright).forEach((k) => themes.add(k.toLowerCase()));
  });
  const themeList = [...themes].slice(0, 3).join(", ");

  if (question.includes("love") || question.includes("relationship")) {
    return `Your question touches the heart. The cards speak of ${themeList} — energies that shape how we give and receive love.`;
  }
  if (question.includes("work") || question.includes("career") || question.includes("job") || question.includes("money")) {
    return `Your question concerns your path in the world. The cards reveal ${themeList} — forces that move through your work and ambition.`;
  }
  if (question.includes("feel") || question.includes("emotion") || question.includes("sad") || question.includes("anxious")) {
    return `You ask about your inner world. The cards reflect ${themeList} — energies present within and around you right now.`;
  }
  return `The cards have been drawn. They speak of ${themeList} — energies woven through your question and the moment you find yourself in.`;
}

/** Craft a closing reflection. */
function craftClosing(drawn: DrawnCardWithMeta[]): string {
  const hasReversed = drawn.some((d) => d.reversed);
  const allUpright = !hasReversed;

  if (allUpright) {
    return "All cards fall upright — the path is open. What you seek is available to you; the work now is to receive it.";
  }
  if (drawn.every((d) => d.reversed)) {
    return "Every card is reversed — this is a time of inversion and inner turning. What feels blocked may be asking you to look differently. The obstacle is the teacher.";
  }
  return "The mix of upright and reversed cards speaks of a path in motion — some things opening, others asking for patience. Honour both. The reading is not a verdict but a mirror.";
}

/* ============================================================
   SANITIZE: Remove any meta-commentary / chain-of-thought leakage
   ============================================================ */

/**
 * Some free LLM models leak their internal reasoning into the output
 * (e.g., "We need to follow the instructions...", "I will produce...",
 * "Thus output should be...", "Make sure to...").
 *
 * This function strips that meta-commentary and returns only the
 * actual tarot reading.
 */
function sanitizeReading(text: string): string {
  let cleaned = text;

  // Aggressive removal: if the text contains known meta patterns,
  // find the first YES/NO/MAYBE or the first substantial reading line
  // and return everything from there onward.

  const metaIndicators = [
    "we need to", "i will produce", "thus output", "make sure to",
    "make sure we don't", "so output:", "must be", "let's do",
    "let me", "let's", "i am going to", "the user asks", "the user says",
    "we are supposed to", "the system", "the instructions",
    "here is your reading", "based on the instructions",
    "following the instructions", "sentence 1:", "sentence 2:",
    "sentence 3:", "i'll", "i will", "we should respect",
    "we are to", "the user's request", "the user now asks",
    "note:", "disclaimer:", "remember:", "critical:",
  ];

  const lower = cleaned.toLowerCase();

  // Check if any meta indicator is present
  const hasMeta = metaIndicators.some(p => lower.includes(p));

  if (!hasMeta) {
    return cleaned.trim();
  }

  // Split into lines and find the first "real" reading line
  const lines = cleaned.split("\n");
  const readingLines: string[] = [];
  let foundStart = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const lineLower = trimmed.toLowerCase();

    // Skip empty lines before reading starts
    if (!foundStart && trimmed === "") continue;

    // Check if this line contains meta indicators
    const lineHasMeta = metaIndicators.some(p => lineLower.includes(p));

    // Check if this line looks like the start of a reading
    if (!foundStart) {
      // YES/NO/MAYBE on its own line
      if (/^(YES|NO|MAYBE)\s*$/i.test(trimmed)) {
        foundStart = true;
        readingLines.push(line);
        continue;
      }
      // A line longer than 40 chars that doesn't contain meta phrases
      // and looks like natural prose (not instructions)
      if (trimmed.length > 40 && !lineHasMeta &&
          !/^(answer|explanation|output|response|reading):/i.test(trimmed) &&
          !/\[(sentence|placeholder)/i.test(trimmed)) {
        foundStart = true;
        readingLines.push(line);
        continue;
      }
      // Skip meta lines
      continue;
    }

    // After finding start, include all lines except obvious meta
    if (lineHasMeta && readingLines.length > 0) {
      // If we already have content and this is meta, stop
      break;
    }
    readingLines.push(line);
  }

  cleaned = readingLines.join("\n").trim();

  // If nothing survived, return a fallback
  if (cleaned.length < 20) {
    return "The cards speak to your question. Reflect on their symbolism and trust your intuition.";
  }

  // Final cleanup: remove any remaining bracketed placeholders like [Sentence1]
  cleaned = cleaned.replace(/\[.*?\]/g, "").trim();

  // Remove "So output:" or similar remnants
  cleaned = cleaned.replace(/^(so output|output|answer|explanation|reading):\s*/i, "").trim();

  return cleaned;
}

/* ============================================================
   MAIN: try all 3 tiers in order
   ============================================================ */

export async function interpretReading(
  question: string,
  spreadType: string,
  drawn: DrawnCardWithMeta[],
  isPremium: boolean
): Promise<string> {
  // Tier 1: OpenRouter free models (if API key is set)
  if (OPENROUTER_API_KEY) {
    const openrouterResult = await tryOpenRouter(question, spreadType, drawn, isPremium);
    if (openrouterResult) return openrouterResult;
  }

  // Tier 2: z-ai-web-dev-sdk
  const zaiResult = await tryZAI(question, spreadType, drawn, isPremium);
  if (zaiResult) return zaiResult;

  // Tier 3: Smart fallback (no LLM)
  console.log("All LLM tiers failed — using smart template fallback");
  return fallbackInterpretation(question, spreadType, drawn, isPremium);
}
