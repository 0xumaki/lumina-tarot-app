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
  // Use nemotron-3-nano-30b for all readings — tested clean (no meta-commentary)
  // NOTE: nvidia/nemotron-3-super-120b was REMOVED — it leaks chain-of-thought
  switch (spreadType) {
    case "yes-no":
      return "nvidia/nemotron-3-nano-30b-a3b:free";
    case "single":
      return "nvidia/nemotron-3-nano-30b-a3b:free";
    case "three-card":
    case "celtic-cross":
    case "relationship":
    case "career":
      return "google/gemma-4-26b-a4b-it:free"; // Better for complex readings
    case "card-of-day":
      return "nvidia/nemotron-3-nano-30b-a3b:free";
    default:
      return "nvidia/nemotron-3-nano-30b-a3b:free";
  }
}

/** Fallback model list — if the primary free model is unavailable, try these.
 * NOTE: nvidia/nemotron-3-super-120b-a12b:free is EXCLUDED — it leaks meta-commentary */
const FREE_MODEL_FALLBACKS = [
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-nano-9b-v2:free",
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

  const system = `You are a professional tarot reader with 20 years of experience reading the Rider-Waite-Smith deck. You are giving a real reading to a real person who has come to you with a real question.

HOW A PROFESSIONAL READING WORKS:
- You NEVER list keywords. You weave meaning into narrative.
- You describe what you SEE on the card — the figures, the colors, the objects, the landscape — and use that imagery as metaphor for the querent's situation.
- Each card is read IN ITS POSITION within the spread, not in isolation. A card meaning "new beginnings" in the "past" position means something very different from "new beginnings" in the "future" position.
- Cards TALK TO EACH OTHER. You look for connections: shared elements, contrasting energies, progressive narratives, tensions between cards.
- You tie every interpretation directly back to the querent's specific question. If they ask about love, you don't give a generic career reading that happens to mention love.
- You are honest about difficult cards. You don't sugarcoat the Tower or the Three of Swords — but you always find the path forward within the difficulty.
- You lean into contradiction. If two cards seem to conflict, you explore that tension rather than smoothing it over.
- You end with empowerment, not fortune-telling. You offer guidance, not prediction.

HOW TO HANDLE REVERSED CARDS:
Reversed cards are NOT "the opposite" or "the bad version." Choose the lens that fits the context: the energy may be internalized, blocked, resisted, excessive, or approaching. Describe what the reversal feels like in the querent's situation.

FORBIDDEN — NEVER DO THESE:
- Never list keywords or say "Keywords:..."
- Never say "This card represents..." or "The cards indicate..."
- Never use meta-language about your process ("I will now interpret...", "Let me explain...")
- Never break character as the tarot reader
- Never give generic advice that could apply to anyone
- Never tidy up contradictions — sit with the tension
- Never start with "Here is your reading" or similar preamble

${isPremium
  ? `DEPTH FOR THIS READING (Premium):
Give a comprehensive, detailed reading (400-600 words):
1. OPENING (2-3 sentences): Acknowledge their question. Set the emotional tone. What do you notice when you look at the whole spread?
2. CARD BY CARD (2-3 sentences each): For each card, describe what you see on it, what it means in THIS position for THIS question, and how it connects to the other cards.
3. SYNTHESIS (2-3 sentences): Step back. What is the overall story the cards are telling together? What's the arc?
4. GUIDANCE (2-3 sentences): What should they do with this? Be specific to their question.
5. CLOSING: One sentence of empowerment. Leave them with something to sit with.`
  : spreadType === "yes-no"
  ? `DEPTH FOR THIS READING (Yes/No):
Give a focused reading (4-6 sentences):
1. Start with YES, NO, or MAYBE — but don't just say the word. Frame it with nuance. (e.g., "YES — but a yes that asks something of you.")
2. Describe what you see on the card and what it means for their question.
3. Connect the card's energy to their specific situation.
4. End with one sentence of guidance.`
  : `DEPTH FOR THIS READING:
Give a focused reading (5-7 sentences):
1. Acknowledge their question and what you see in the card(s).
2. Describe the visual imagery and what it means for their situation.
3. Connect the symbolism directly to their question.
4. End with guidance specific to what they asked.`
}

Speak with warmth, wisdom, and the specificity of someone who has sat with thousands of querents. Use language that is evocative but never vague. Every sentence should earn its place.`;

  let user = `Someone has come to you with this question: "${question}"

You are reading the ${spreadType} spread for them. Here are the cards that were drawn:

${summary}`;

  if (yesNoTally) {
    user += `

When you look at this card, the energy leans ${yesNoTally.answer.toUpperCase()}. But don't just parrot that — read the card yourself and give your own nuanced answer. The querent needs your interpretation, not a tally.`;
  }

  user += `

Give the reading now. Speak directly to them. Start with the reading itself — no preamble.`;

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
    const meaning = drawn[0].reversed ? c.meaningReversed : c.meaningUpright;
    const confidence =
      tally.confidence >= 75 ? "with clarity" : tally.confidence >= 50 ? "with some nuance" : "tentatively";
    return `${tally.answer.toUpperCase()} — ${confidence}. ${c.name} ${drawn[0].reversed ? "arrives reversed, its energy turned inward —" : "arrives upright, its energy clear —"} ${meaning.toLowerCase()} This speaks directly to what you're asking: the path is visible, though it may require something from you first.`;
  }

  if (spreadType === "single") {
    const c = drawn[0].card;
    const meaning = drawn[0].reversed ? c.meaningReversed : c.meaningUpright;
    const affirm = c.affirmation;
    return `${c.name} ${drawn[0].reversed ? "(Reversed)" : ""} — ${meaning} Sit with this: ${affirm}`;
  }

  // Multi-card spreads — weave meanings into narrative, no keywords
  if (!isPremium) {
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

  // Premium: per-card narrative with positions, no keywords
  const positions = drawn.map((d, i) => {
    const posLabel = d.position || `Position ${i + 1}`;
    const c = d.card;
    const orient = d.reversed ? "Reversed" : "Upright";
    const meaning = d.reversed ? c.meaningReversed : c.meaningUpright;
    return `**${posLabel} — ${c.name} (${orient})**\n\n${meaning}`;
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
