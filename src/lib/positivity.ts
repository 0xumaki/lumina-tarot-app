/**
 * Lumina — Positivity Generator
 *
 * Generates 1-3 minute positivity recitation scripts based on the user's
 * desired goal (Wealth, Health, Relationship, Career, Stress Release, etc.)
 *
 * All scripts use ONLY "I" statements (first person) — never "you".
 * This makes the affirmations personal and direct: "I am wealthy" not "You are wealthy".
 *
 * Two-tier system:
 *   Tier 1: OpenRouter free LLM (if API key available) — personalized, rich
 *   Tier 2: Smart template-based scripts (always works, no LLM needed)
 *
 * Free tier: 1 session/day. Premium: unlimited.
 */

export type PositivityCategory =
  | "wealth"
  | "money"
  | "health"
  | "relationship"
  | "power"
  | "career"
  | "promotion"
  | "stress-release"
  | "anxiety"
  | "worries"
  | "anti-negative"
  | "custom";

export interface PositivityCategoryMeta {
  id: PositivityCategory;
  label: string;
  glyph: string;
  color: string;
  desc: string;
  keywords: string[];
  frequencyHz: number; // Solfeggio frequency for this intention
  frequencyName: string;
}

export const POSITIVITY_CATEGORIES: PositivityCategoryMeta[] = [
  {
    id: "wealth",
    label: "Wealth",
    glyph: "✦",
    color: "#E7D2A8",
    desc: "Abundance, prosperity, and financial freedom",
    keywords: ["wealth", "abundance", "prosperity", "rich", "fortune", "luxury", "opulence"],
    frequencyHz: 888,
    frequencyName: "Abundance Frequency",
  },
  {
    id: "money",
    label: "Money",
    glyph: "◉",
    color: "#B5CD7E",
    desc: "Income, savings, and financial flow",
    keywords: ["money", "income", "salary", "savings", "cash", "earn", "bank", "financial"],
    frequencyHz: 888,
    frequencyName: "Abundance Frequency",
  },
  {
    id: "health",
    label: "Health",
    glyph: "✚",
    color: "#B5CD7E",
    desc: "Vitality, healing, and physical wellbeing",
    keywords: ["health", "heal", "body", "wellness", "vitality", "energy", "strong", "fit"],
    frequencyHz: 528,
    frequencyName: "Miracle Healing",
  },
  {
    id: "relationship",
    label: "Relationship",
    glyph: "♡",
    color: "#D876A0",
    desc: "Love, connection, and harmony with others",
    keywords: ["love", "relationship", "partner", "connection", "romance", "harmony", "bond", "soulmate"],
    frequencyHz: 639,
    frequencyName: "Connection & Love",
  },
  {
    id: "power",
    label: "Power",
    glyph: "▲",
    color: "#F09A3D",
    desc: "Confidence, strength, and personal authority",
    keywords: ["power", "strength", "confidence", "authority", "bold", "fearless", "leader", "command"],
    frequencyHz: 741,
    frequencyName: "Awakening Intuition",
  },
  {
    id: "career",
    label: "Career",
    glyph: "◆",
    color: "#5FA9C7",
    desc: "Success, purpose, and professional growth",
    keywords: ["career", "job", "work", "profession", "success", "purpose", "calling", "path"],
    frequencyHz: 852,
    frequencyName: "Spiritual Awakening",
  },
  {
    id: "promotion",
    label: "Promotion",
    glyph: "↑",
    color: "#C5A87C",
    desc: "Advancement, recognition, and rising higher",
    keywords: ["promotion", "advance", "rise", "promote", "upgrade", "elevate", "recognize", "achieve"],
    frequencyHz: 852,
    frequencyName: "Spiritual Awakening",
  },
  {
    id: "stress-release",
    label: "Stress Release",
    glyph: "〜",
    color: "#9E8AC9",
    desc: "Let go of tension, pressure, and overwhelm",
    keywords: ["stress", "tension", "pressure", "overwhelm", "release", "relax", "unwind", "ease"],
    frequencyHz: 396,
    frequencyName: "Liberation from Fear",
  },
  {
    id: "anxiety",
    label: "Anxiety",
    glyph: "◐",
    color: "#9E8AC9",
    desc: "Calm the mind, find peace and stillness",
    keywords: ["anxiety", "worry", "fear", "nervous", "panic", "calm", "peace", "stillness", "serene"],
    frequencyHz: 396,
    frequencyName: "Liberation from Fear",
  },
  {
    id: "worries",
    label: "Worries",
    glyph: "○",
    color: "#9E8AC9",
    desc: "Release concerns and trust the process",
    keywords: ["worry", "concerns", "doubt", "trust", "faith", "surrender", "let go", "release"],
    frequencyHz: 417,
    frequencyName: "Facilitating Change",
  },
  {
    id: "anti-negative",
    label: "Anti-Negative",
    glyph: "✕",
    color: "#F09A3D",
    desc: "Clear negativity, protect your energy",
    keywords: ["negative", "negativity", "clear", "protect", "shield", "cleanse", "purify", "ward"],
    frequencyHz: 417,
    frequencyName: "Facilitating Change",
  },
];

/** Detect the best category from free-form user text. */
export function detectCategory(text: string): PositivityCategory {
  const lower = text.toLowerCase();
  let best: PositivityCategory = "custom";
  let bestScore = 0;
  for (const cat of POSITIVITY_CATEGORIES) {
    let score = 0;
    for (const kw of cat.keywords) {
      if (lower.includes(kw)) {
        score += kw.length > 5 ? 3 : 2;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = cat.id;
    }
  }
  return best;
}

export interface PositivityLine {
  text: string;
  durationSec: number;
}

export interface PositivityScript {
  category: PositivityCategory;
  title: string;
  intention: string;
  lines: PositivityLine[];
  totalDurationSec: number;
  source: "llm" | "template";
}

/* ============================================================
   TEMPLATE-BASED SCRIPT GENERATOR (always works, no LLM)
   ALL scripts use ONLY "I" statements — first person, personal.
   ============================================================ */

const TEMPLATES: Record<PositivityCategory, {
  title: string;
  opening: string[];
  affirmations: string[];
  closing: string[];
}> = {
  wealth: {
    title: "Magnetizing Wealth",
    opening: [
      "I breathe in, and I feel the openness of abundance all around me.",
      "I understand that wealth is not something I chase — it is something I become.",
      "I am a magnet for prosperity, and the universe conspires in my favor.",
    ],
    affirmations: [
      "I allow money to flow to me easily, naturally, and in great abundance.",
      "I am worthy of unlimited wealth and financial freedom.",
      "I bless every dollar I spend, knowing it returns to me multiplied.",
      "I attract opportunities to create wealth every single day.",
      "I release all scarcity. I know there is more than enough for everyone.",
      "I welcome prosperity as my natural state of being.",
      "I am surrounded by wealth — in nature, in people, in ideas.",
      "I release the illusion of lack. I step into my abundance now.",
      "I celebrate the wealth of others, knowing mine is on its way.",
      "I receive abundantly so I can give abundantly. This is my cycle.",
    ],
    closing: [
      "I take a breath and let this truth settle into my bones.",
      "I walk today as a wealthy soul, and I act accordingly.",
      "I claim my abundance. And so it is.",
    ],
  },
  money: {
    title: "Attracting Money",
    opening: [
      "I breathe deeply, feeling the energy of money moving toward me.",
      "I know that money is energy, and it flows to those who welcome it.",
      "I have a healthy, joyful relationship with money.",
    ],
    affirmations: [
      "I welcome money into my life with open arms.",
      "I watch my income increase every day, in expected and unexpected ways.",
      "I am a wise steward of the money that comes to me.",
      "I know that money loves me, seeks me, and finds me.",
      "I release all fear around money. I trust the flow.",
      "I attract financial opportunities in every interaction today.",
      "I am grateful for the money I have, and excited for what is coming.",
      "I value my work, and I am paid well for it.",
      "I use money as a tool for good, and I use it wisely.",
      "I am financially free. I claim this as my reality now.",
    ],
    closing: [
      "I feel the relief and the freedom. This is mine.",
      "I move through today knowing money flows to me with ease.",
      "I open my financial flow. And so it is.",
    ],
  },
  health: {
    title: "Radiant Health",
    opening: [
      "I breathe into my body and feel the life force moving through me.",
      "I honor my body as a miracle that heals itself constantly.",
      "I trust that every cell in my body works for my highest good.",
    ],
    affirmations: [
      "I am healthy, strong, and full of vitality.",
      "I feel every cell in my body vibrating with healing energy.",
      "I nourish my body, and my body nourishes me.",
      "I release all dis-ease and welcome vibrant health.",
      "I have a powerful immune system that protects me perfectly.",
      "I sleep deeply and wake restored and energized.",
      "I trust my body to know exactly how to heal itself.",
      "I am grateful for this body and all it does for me.",
      "I return to health as my natural state.",
      "I feel alive. I feel strong. I feel well.",
    ],
    closing: [
      "I send gratitude to my body, knowing it hears me.",
      "I move through today in radiant health.",
      "I claim my wholeness. And so it is.",
    ],
  },
  relationship: {
    title: "Opening to Love",
    opening: [
      "I breathe into my heart and feel it soften and open.",
      "I know that love is not something I find — it is something I embody.",
      "I am worthy of deep, soul-nourishing connection.",
    ],
    affirmations: [
      "I am worthy of a love that is deep, true, and lasting.",
      "I keep my heart open to giving and receiving love freely.",
      "I attract people who see me, honor me, and cherish me.",
      "I release the past and welcome love that is meant for me.",
      "I am a magnet for healthy, beautiful relationships.",
      "I allow love to flow to me easily and naturally.",
      "I know I am enough — exactly as I am — for the right person.",
      "I give love without expectation and receive it without fear.",
      "I nurture my relationships with presence and care.",
      "I am surrounded by love — in friendships, family, and romance.",
    ],
    closing: [
      "I feel the warmth in my chest — that is love, already present.",
      "I move through today as love itself.",
      "I open my heart fully. And so it is.",
    ],
  },
  power: {
    title: "Embodying Power",
    opening: [
      "I stand tall, breathe deep, and feel my own strength.",
      "I know that power is not domination — it is alignment with my truth.",
      "I was born powerful. Today, I remember.",
    ],
    affirmations: [
      "I am powerful beyond measure.",
      "I stand in my truth without apology.",
      "I know my voice matters and my presence changes the room.",
      "I trust my instincts and act with courage.",
      "I am the author of my life, and I write the story.",
      "I refuse to let fear control me. I move through it.",
      "I command respect by the way I honor myself.",
      "I am bold. I am decisive. I am unstoppable.",
      "I protect my energy fiercely because it is sacred.",
      "I step into my power fully, without hesitation.",
    ],
    closing: [
      "I feel the strength in my spine — that is me.",
      "I walk today as the powerful soul I am.",
      "I claim my power. And so it is.",
    ],
  },
  career: {
    title: "Career Alignment",
    opening: [
      "I breathe and feel the alignment between my work and my purpose.",
      "I know my career is not separate from my life — it is an expression of it.",
      "I am meant to do work that matters, and I will.",
    ],
    affirmations: [
      "I am aligned with work that fulfills and inspires me.",
      "I let my career reflect my deepest values.",
      "I am recognized for my talents and contributions.",
      "I attract opportunities because I am ready for them.",
      "I trust the unfolding of my professional path.",
      "I work with people who uplift and challenge me.",
      "I make a positive impact through my work.",
      "I am exactly where I need to be right now.",
      "I allow success to flow to me without force.",
      "I bring my full self to my work, and it shows.",
    ],
    closing: [
      "I feel the rightness of my path — I am on it.",
      "I move closer today to my highest professional expression.",
      "I claim my aligned, thriving career. And so it is.",
    ],
  },
  promotion: {
    title: "Rising Higher",
    opening: [
      "I breathe upward and feel myself rising above where I was.",
      "I know I have outgrown my current level — the next is calling.",
      "I understand that promotion is readiness meeting opportunity.",
    ],
    affirmations: [
      "I am ready for the next level of my career.",
      "I am seen, valued, and rewarded for my work.",
      "I rise naturally because I bring excellence to everything I do.",
      "I am recognized by leadership and promoted for my contribution.",
      "I release competition — my path is mine alone, and it rises.",
      "I am the obvious choice for advancement.",
      "I grow my skills daily, making myself indispensable.",
      "I step into greater responsibility with confidence and grace.",
      "I allow the universe to orchestrate my elevation.",
      "I claim my promotion — energetically, it is already mine.",
    ],
    closing: [
      "I feel the elevation — I am already rising.",
      "I move through today ascending, ready to be seen.",
      "I welcome my promotion. And so it is.",
    ],
  },
  "stress-release": {
    title: "Releasing Stress",
    opening: [
      "I breathe out and let the tension leave with my exhale.",
      "I know I do not need to carry it all — I can set it down.",
      "I accept that this moment is enough. I am enough. Right now.",
    ],
    affirmations: [
      "I release the tension I have been holding.",
      "I let my shoulders drop, my jaw soften, my breath deepen.",
      "I am safe in this moment — there is nothing to solve right now.",
      "I let go of what I cannot control.",
      "I trust that everything is working out for me.",
      "I feel my body relaxing, layer by layer, breath by breath.",
      "I give myself permission to rest.",
      "I know the pressure I feel is temporary — this too shall pass.",
      "I am calm. I am centered. I am at peace.",
      "I choose ease over effort, flow over force.",
    ],
    closing: [
      "I feel the lightness — I have set down what was not mine to carry.",
      "I move through today with ease and grace.",
      "I claim my peace. And so it is.",
    ],
  },
  anxiety: {
    title: "Calming Anxiety",
    opening: [
      "I breathe slowly — in for four, hold for four, out for six.",
      "I remind myself: I am safe. This feeling will pass. I am not in danger.",
      "I feel my nervous system recalibrating. I am okay.",
    ],
    affirmations: [
      "I am safe in this moment, in this body, in this place.",
      "I let my breath calm my mind, and my mind calm my body.",
      "I release the need to control the uncontrollable.",
      "I have survived every anxious moment — I will survive this one too.",
      "I let this feeling be a wave that washes over me and passes.",
      "I am grounded. I am present. I am here, now.",
      "I remember that my thoughts are just thoughts — they are not facts.",
      "I trust my body to find its balance.",
      "I return to peace as my natural state.",
      "I am okay. I am okay. I am okay.",
    ],
    closing: [
      "I feel the stillness settling in — I am safe.",
      "I move through today with calm and clarity.",
      "I claim my peace. And so it is.",
    ],
  },
  worries: {
    title: "Releasing Worries",
    opening: [
      "I breathe and notice my worries without gripping them.",
      "I know that worry is a prayer for what I don't want — I change the prayer.",
      "I accept that I cannot control the future, but I can choose peace now.",
    ],
    affirmations: [
      "I release my worries to something greater than myself.",
      "I trust the unfolding of my life.",
      "I know that what I worry about rarely comes to pass — I let it go.",
      "I focus on what I can control: my breath, my choice, my now.",
      "I choose faith over fear — faith is stronger.",
      "I surrender the outcome and trust the process.",
      "I keep my mind clear, my heart light, my path guided.",
      "I have everything I need for this moment.",
      "I let the future take care of itself — I take care of now.",
      "I am held. I am guided. I am safe.",
    ],
    closing: [
      "I feel the release — the weight is lighter now.",
      "I move through today trusting more and worrying less.",
      "I free myself from worry. And so it is.",
    ],
  },
  "anti-negative": {
    title: "Clearing Negativity",
    opening: [
      "I breathe in light and exhale anything that is not mine.",
      "I am the guardian of my energy — today, I guard it well.",
      "I know that negativity cannot cling to a heart filled with light.",
    ],
    affirmations: [
      "I release all negativity that has attached to me.",
      "I claim my energy as my own and protect it with intention.",
      "I surround myself with a shield of golden light.",
      "I let negativity pass through me without sticking.",
      "I cleanse my mind, my body, my space.",
      "I choose thoughts that uplift and empower me.",
      "I distance myself from what drains me.",
      "I am a beacon of positivity — darkness dissolves in my presence.",
      "I keep my aura bright, clear, and protected.",
      "I return all energy that is not mine to its source with love.",
    ],
    closing: [
      "I feel the clarity — my energy is clean and mine.",
      "I move through today shielded and bright.",
      "I claim my clarity and protection. And so it is.",
    ],
  },
  custom: {
    title: "Daily Positivity",
    opening: [
      "I breathe in and feel the possibility of this new day.",
      "I know I am the creator of my experience — today, I create well.",
      "I trust that everything I need is already within me.",
    ],
    affirmations: [
      "I am exactly where I need to be.",
      "I trust myself and the path I am on.",
      "I see today as full of opportunities for joy and growth.",
      "I am worthy of all the good things coming my way.",
      "I choose positivity, even when it is not easy.",
      "I attract beautiful experiences today through my energy.",
      "I am grateful for this life and all its gifts.",
      "I let go of what was and welcome what is becoming.",
      "I am calm, capable, and confident.",
      "I allow good things to find me right now.",
    ],
    closing: [
      "I feel the positivity settling into my being.",
      "I walk forward today with an open heart and clear mind.",
      "I bless my day. And so it is.",
    ],
  },
};

/** Generate a template-based positivity script. */
export function generateTemplateScript(
  category: PositivityCategory,
  intention: string,
  targetDurationSec?: number
): PositivityScript {
  const template = TEMPLATES[category] || TEMPLATES.custom;

  // Personalize the opening with the user's intention
  const personalizedOpening = intention.trim()
    ? [
        `I am here for: ${intention.trim()}.`,
        ...template.opening.slice(1),
      ]
    : template.opening;

  let allLines: PositivityLine[] = [
    ...personalizedOpening.map((text) => ({ text, durationSec: 9 })),
    ...template.affirmations.map((text) => ({ text, durationSec: 8 })),
    ...template.closing.map((text) => ({ text, durationSec: 10 })),
  ];

  // If target duration is specified, trim or extend lines to match
  if (targetDurationSec) {
    const targetLines = Math.round(targetDurationSec / 8.5); // avg 8.5s per line
    if (allLines.length > targetLines) {
      // Keep opening + first N affirmations + closing
      const openingCount = personalizedOpening.length;
      const closingCount = template.closing.length;
      const affirmationsToKeep = Math.max(3, targetLines - openingCount - closingCount);
      allLines = [
        ...allLines.slice(0, openingCount),
        ...allLines.slice(openingCount, openingCount + affirmationsToKeep),
        ...allLines.slice(allLines.length - closingCount),
      ];
    }
  }

  return {
    category,
    title: template.title,
    intention: intention.trim() || template.title,
    lines: allLines,
    totalDurationSec: allLines.reduce((sum, l) => sum + l.durationSec, 0),
    source: "template",
  };
}

/* ============================================================
   LLM-BASED SCRIPT GENERATOR (OpenRouter free models)
   Enforces I-statements in the prompt.
   ============================================================ */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function generateLLMScript(
  category: PositivityCategory,
  intention: string,
  targetDurationSec?: number
): Promise<PositivityScript | null> {
  if (!OPENROUTER_API_KEY) return null;

  const catMeta = POSITIVITY_CATEGORIES.find((c) => c.id === category);
  const catName = catMeta?.label || "positivity";
  const targetLineCount = targetDurationSec
    ? Math.round(targetDurationSec / 8.5)
    : 15;

  const system = `You are Lumina, a master of positive psychology, affirmation science, and mindfulness meditation.
You create positivity recitation scripts that people read aloud to start their day with intention and power.
Your scripts are poetic, grounding, and emotionally resonant — never generic or cliché.

CRITICAL RULE: Every line MUST be written in FIRST PERSON ("I" statements) — NEVER use "you" or "your".
- CORRECT: "I am worthy of abundance." "I breathe in peace." "I release all fear."
- WRONG: "You are worthy." "Breathe in peace." "Release all fear."

Each line should feel like a breath. The progression moves from grounding → affirmation → integration.
Return ONLY the script lines, one per line, no numbering, no markdown, no commentary.
Produce ${targetLineCount} lines total. Each line should take 6-10 seconds to recite slowly.`;

  const user = `Create a positivity script for someone seeking: ${catName}
Their specific intention: "${intention || "general positivity and alignment"}"

Structure:
- Lines 1-3: Grounding and opening (slower, spacious, first person)
- Lines 4-${Math.max(4, targetLineCount - 3)}: Core affirmations (direct, powerful, all "I" statements)
- Lines ${Math.max(4, targetLineCount - 2)}-${targetLineCount}: Integration and closing (sealing the practice, first person)

Remember: EVERY line must use "I" — never "you".
Return ONLY the lines, one per line. No numbering, no markdown.`;

  const models = [
    "nvidia/nemotron-nano-9b-v2:free",
    "google/gemma-4-26b-a4b-it:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
  ];

  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://lumina.app",
          "X-Title": "Lumina Positivity",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.85,
          max_tokens: 800,
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text || text.length < 50) continue;

      // Parse the response into lines
      const rawLines = text
        .split("\n")
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0 && !l.match(/^\d+\./) && !l.startsWith("#") && !l.startsWith("-"));

      if (rawLines.length < 8) continue;

      // Sanitize: convert any "you" statements to "I" statements
      const sanitizedLines = rawLines.slice(0, 15).map((line: string) => {
        let cleaned = line.replace(/^["']|["']$/g, "");
        // Convert "You are" → "I am", "You have" → "I have", etc.
        cleaned = cleaned.replace(/^You are /i, "I am ");
        cleaned = cleaned.replace(/^You have /i, "I have ");
        cleaned = cleaned.replace(/^You can /i, "I can ");
        cleaned = cleaned.replace(/^You will /i, "I will ");
        cleaned = cleaned.replace(/^You are\b/gi, "I am");
        cleaned = cleaned.replace(/^You\b/gi, "I");
        return cleaned;
      });

      const lines: PositivityLine[] = sanitizedLines.map((line: string, i: number) => ({
        text: line,
        durationSec: i < 3 ? 9 : i >= sanitizedLines.length - 3 ? 10 : 8,
      }));

      return {
        category,
        title: TEMPLATES[category]?.title || `${catName} Positivity`,
        intention: intention.trim() || catName,
        lines,
        totalDurationSec: lines.reduce((sum, l) => sum + l.durationSec, 0),
        source: "llm",
      };
    } catch {
      continue;
    }
  }

  return null;
}

/* ============================================================
   MAIN: Generate a positivity script (LLM → template fallback)
   ============================================================ */

export async function generatePositivityScript(
  category: PositivityCategory,
  intention: string,
  targetDurationSec?: number
): Promise<PositivityScript> {
  // Tier 1: Try LLM
  const llmScript = await generateLLMScript(category, intention, targetDurationSec);
  if (llmScript) return llmScript;

  // Tier 2: Template fallback
  return generateTemplateScript(category, intention, targetDurationSec);
}
