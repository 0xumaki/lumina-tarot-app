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
  // Ordered preference — first available wins.
  // All are :free variants so they cost $0.
  switch (spreadType) {
    case "yes-no":
      // Short answer — use a fast, small model
      return "meta-llama/llama-3.2-3b-instruct:free";
    case "single":
      return "google/gemma-2-9b-it:free";
    case "three-card":
      return "meta-llama/llama-3.1-8b-instruct:free";
    case "celtic-cross":
    case "relationship":
    case "career":
      // Complex reading — use the most capable free model
      return "meta-llama/llama-3.1-8b-instruct:free";
    case "card-of-day":
      return "meta-llama/llama-3.1-8b-instruct:free";
    default:
      return "meta-llama/llama-3.1-8b-instruct:free";
  }
}

/** Fallback model list — if the primary free model is unavailable, try these. */
const FREE_MODEL_FALLBACKS = [
  "meta-llama/llama-3.2-3b-instruct:free",
  "google/gemma-2-9b-it:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "qwen/qwen-2.5-7b-instruct:free",
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
          temperature: 0.85,
          max_tokens: isPremium ? 1200 : 200,
        }),
        // 25s timeout — OpenRouter free models can be slow
        signal: AbortSignal.timeout(25000),
      });

      if (!res.ok) {
        // Try next model
        continue;
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text && text.length > 20) {
        return text;
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
    const text = completion.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    return text;
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

  const system = `You are Lumina, an insightful, warm, and grounded tarot reader.
You honour the Rider–Waite tradition and the symbolism of each card.
Your voice is poetic but never vague, compassionate but honest.
You weave the cards into a single coherent narrative that directly answers the querent's question.
Never claim to predict the future with certainty — offer guidance, energy, and reflection.
Keep language accessible. Use second person ("you"). Avoid filler like "The cards indicate".
${isPremium ? "Provide a rich, multi-paragraph reading: an opening, per-card analysis, and a closing reflection with an affirmation." : "Be concise: 2-4 sentences total."}`;

  let user = `Question: "${question}"
Spread: ${spreadType}
Cards drawn:
${summary}`;
  if (yesNoTally) {
    user += `\n\nYes/No tally from the cards: YES=${yesNoTally.yes}, NO=${yesNoTally.no}, MAYBE=${yesNoTally.maybe}. Suggested answer: ${yesNoTally.answer.toUpperCase()} (confidence ${yesNoTally.confidence}%).`;
  }
  user += `\n\n${
    isPremium
      ? "Give the full reading now."
      : spreadType === "yes-no"
      ? "First state the answer (YES / NO / MAYBE) in one word, then 1-2 sentences explaining why."
      : "In 2-4 sentences, give the core guidance."
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
