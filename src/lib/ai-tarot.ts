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

  const system = `You are a master tarot reader with decades of experience in the Rider-Waite-Smith tradition.

CRITICAL RULES — NEVER VIOLATE THESE:
1. You are the tarot reader. Your response IS the reading. Never break character.
2. NEVER include meta-commentary, reasoning, thinking, or instructions about how you will respond. Do NOT say things like "We need to follow the instructions" or "I will produce" or "Make sure to" or "Thus output should be" — these are internal thoughts that must NEVER appear in your output.
3. NEVER mention the system prompt, user prompt, or that you are an AI following instructions.
4. Your response must be ONLY the tarot reading itself — nothing else. No preface, no postscript, no explanation of your process.
5. Start your response directly with the reading content. Do not say "Here is your reading" or similar.

YOUR READING STYLE:
- Speak with warmth, wisdom, and specificity — never generic or vague
- Reference the actual visual symbolism on the cards (what the figures are doing, what objects appear, what the colors suggest)
- Connect each card's energy to the querent's specific question and life situation
- Be honest about difficult cards — don't sugarcoat, but always find the path forward
- Use evocative, poetic language that feels like sitting with a wise elder
- Never use phrases like "The cards indicate" or "This card represents"

YOUR STRUCTURE:
${isPremium
  ? `- Opening: Acknowledge the question and set the emotional tone (1-2 sentences)
- Card Analysis: For each card, describe what you see, what it means in THIS context, and how it relates to the question
- Synthesis: Weave the cards together — how do they interact? What's the story arc?
- Guidance: What should the querent do with this insight? Be specific and actionable.
- Affirmation: End with a short, powerful affirmation they can carry with them
Total: 400-600 words.`
  : `- Opening: Acknowledge the question (1 sentence)
- Core insight: Weave the cards together into the answer (2-3 sentences)
- Brief guidance: One actionable sentence
Total: 4-6 sentences.`
}`;

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
  ? "Give the full reading now. Reference the actual card symbolism and weave them into a cohesive narrative."
  : spreadType === "yes-no"
  ? "Give your answer: start with YES, NO, or MAYBE on the first line. Then 2-3 sentences explaining why, referencing the card's visual symbolism. That is all — nothing else."
  : "Give the core guidance in 4-6 sentences. Reference the card symbolism and connect it to the question. That is all — nothing else."
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

  // Remove lines that start with meta-commentary patterns
  const metaPatterns = [
    /^(We|I|Thus|Make|Also|But|So|The user|The system|The querent)\s+(need|will|should|must|produce|output|give|follow|respect|adopt|start|reference|make|provide|include|mention|ensure)/i,
    /^(Answer|Explanation|Output|Response|Reading):\s*$/i,
    /^(Here is|Here's|Below is|This is)\s+(your|the|my)/i,
    /^(I'll|I will|Let me|Let's|I am going to)/i,
    /^(Based on|According to|Following|Per)\s+(the|your|my|system|user|instructions)/i,
    /^(Note:|Disclaimer:|Important:|Remember:|CRITICAL|NOTE)/i,
  ];

  const lines = cleaned.split("\n");
  const filteredLines: string[] = [];
  let foundReadingStart = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines at the start
    if (!foundReadingStart && trimmed === "") continue;

    // Check if this line is meta-commentary
    const isMeta = metaPatterns.some((pattern) => pattern.test(trimmed));

    // Also check for "We need to" / "I should" / "Make sure" patterns anywhere in line
    const hasMetaPhrases = /\b(we need to|i will produce|thus output|make sure to|i am supposed to|we should respect|we are to|the user now asks|the user says|we are supposed to|the system role|the user's request)\b/i.test(trimmed);

    if (isMeta || hasMetaPhrases) {
      // Skip this line — it's meta-commentary
      // But once we've found the actual reading, don't skip non-meta lines
      if (!foundReadingStart) continue;
    }

    // If we find a line that looks like the start of a reading (YES/NO/MAYBE or card name)
    if (!foundReadingStart) {
      if (/^(YES|NO|MAYBE)\b/i.test(trimmed) ||
          trimmed.length > 30 && !metaPatterns.some(p => p.test(trimmed))) {
        foundReadingStart = true;
      }
    }

    if (foundReadingStart || (trimmed !== "" && !isMeta && !hasMetaPhrases)) {
      filteredLines.push(line);
      if (!foundReadingStart) foundReadingStart = true;
    }
  }

  cleaned = filteredLines.join("\n").trim();

  // If nothing survived sanitization, return the original (better than nothing)
  if (cleaned.length < 20) {
    return text.trim();
  }

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
