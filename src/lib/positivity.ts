/**
 * Lumina — Positivity Generator
 *
 * Generates 1-3 minute positivity recitation scripts based on the user's
 * desired goal (Wealth, Health, Relationship, Career, Stress Release, etc.)
 *
 * Two-tier system:
 *   Tier 1: OpenRouter free LLM (if API key available) — personalized, rich
 *   Tier 2: Smart template-based scripts (always works, no LLM needed)
 *
 * Each script is broken into ~8-15 "affirmation lines" that display as
 * subtitles for ~6-10 seconds each, totaling 1-3 minutes of recitation.
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
}

export const POSITIVITY_CATEGORIES: PositivityCategoryMeta[] = [
  {
    id: "wealth",
    label: "Wealth",
    glyph: "✦",
    color: "#E7D2A8",
    desc: "Abundance, prosperity, and financial freedom",
    keywords: ["wealth", "abundance", "prosperity", "rich", "fortune", "luxury", "opulence"],
  },
  {
    id: "money",
    label: "Money",
    glyph: "◉",
    color: "#B5CD7E",
    desc: "Income, savings, and financial flow",
    keywords: ["money", "income", "salary", "savings", "cash", "earn", "bank", "financial"],
  },
  {
    id: "health",
    label: "Health",
    glyph: "✚",
    color: "#B5CD7E",
    desc: "Vitality, healing, and physical wellbeing",
    keywords: ["health", "heal", "body", "wellness", "vitality", "energy", "strong", "fit"],
  },
  {
    id: "relationship",
    label: "Relationship",
    glyph: "♡",
    color: "#D876A0",
    desc: "Love, connection, and harmony with others",
    keywords: ["love", "relationship", "partner", "connection", "romance", "harmony", "bond", "soulmate"],
  },
  {
    id: "power",
    label: "Power",
    glyph: "▲",
    color: "#F09A3D",
    desc: "Confidence, strength, and personal authority",
    keywords: ["power", "strength", "confidence", "authority", "bold", "fearless", "leader", "command"],
  },
  {
    id: "career",
    label: "Career",
    glyph: "◆",
    color: "#5FA9C7",
    desc: "Success, purpose, and professional growth",
    keywords: ["career", "job", "work", "profession", "success", "purpose", "calling", "path"],
  },
  {
    id: "promotion",
    label: "Promotion",
    glyph: "↑",
    color: "#C5A87C",
    desc: "Advancement, recognition, and rising higher",
    keywords: ["promotion", "advance", "rise", "promote", "upgrade", "elevate", "recognize", "achieve"],
  },
  {
    id: "stress-release",
    label: "Stress Release",
    glyph: "〜",
    color: "#9E8AC9",
    desc: "Let go of tension, pressure, and overwhelm",
    keywords: ["stress", "tension", "pressure", "overwhelm", "release", "relax", "unwind", "ease"],
  },
  {
    id: "anxiety",
    label: "Anxiety",
    glyph: "◐",
    color: "#9E8AC9",
    desc: "Calm the mind, find peace and stillness",
    keywords: ["anxiety", "worry", "fear", "nervous", "panic", "calm", "peace", "stillness", "serene"],
  },
  {
    id: "worries",
    label: "Worries",
    glyph: "○",
    color: "#9E8AC9",
    desc: "Release concerns and trust the process",
    keywords: ["worry", "concerns", "doubt", "trust", "faith", "surrender", "let go", "release"],
  },
  {
    id: "anti-negative",
    label: "Anti-Negative",
    glyph: "✕",
    color: "#F09A3D",
    desc: "Clear negativity, protect your energy",
    keywords: ["negative", "negativity", "clear", "protect", "shield", "cleanse", "purify", "ward"],
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
  durationSec: number; // how long to display this line
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
   Produces ~90-150 seconds of recitation (12-15 lines × 8-10s each)
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
      "Breathe in. Feel the openness of abundance all around you.",
      "Wealth is not something you chase. It is something you become.",
      "You are a magnet for prosperity. The universe conspires in your favor.",
    ],
    affirmations: [
      "Money flows to me easily, naturally, and in great abundance.",
      "I am worthy of unlimited wealth and financial freedom.",
      "Every dollar I spend returns to me multiplied.",
      "Opportunities to create wealth find me every single day.",
      "I release all scarcity. There is more than enough for everyone.",
      "My bank account grows while I sleep, while I eat, while I live.",
      "I am surrounded by wealth — in nature, in people, in ideas.",
      "Prosperity is my natural state. Lack is an illusion I have outgrown.",
      "I bless the wealth of others, knowing mine is on its way.",
      "The more I receive, the more I have to give. This is the cycle of abundance.",
    ],
    closing: [
      "Take a breath. Let this truth settle into your bones.",
      "Today, you walk as a wealthy soul. Act accordingly.",
      "And so it is. Welcome to your abundance.",
    ],
  },
  money: {
    title: "Attracting Money",
    opening: [
      "Breathe deeply. Feel the energy of money as it moves toward you.",
      "Money is energy. It flows to those who welcome it without fear.",
      "You have a healthy, joyful relationship with money.",
    ],
    affirmations: [
      "I welcome money into my life with open arms.",
      "My income increases every day, in expected and unexpected ways.",
      "I am a wise steward of the money that comes to me.",
      "Money loves me. Money seeks me. Money finds me.",
      "I release all fear around money. I trust the flow.",
      "Every interaction I have today brings me closer to financial freedom.",
      "I am grateful for the money I have, and excited for what is coming.",
      "My work is valuable, and I am paid well for it.",
      "Money is a tool for good — and I use it wisely.",
      "I am financially free. I claim this as my reality now.",
    ],
    closing: [
      "Feel the relief. Feel the freedom. This is yours.",
      "Today, money moves toward you with ease.",
      "And so it is. Your financial flow is open.",
    ],
  },
  health: {
    title: "Radiant Health",
    opening: [
      "Breathe into your body. Feel the life force moving through you.",
      "Your body is a miracle. It heals itself constantly.",
      "Every cell in your body is working for your highest good.",
    ],
    affirmations: [
      "My body is healthy, strong, and full of vitality.",
      "Every cell in my body vibrates with healing energy.",
      "I nourish my body, and my body nourishes me.",
      "I release all dis-ease. I welcome vibrant health.",
      "My immune system is powerful and protects me perfectly.",
      "I sleep deeply, and wake restored and energized.",
      "My body knows exactly how to heal itself. I trust it.",
      "I am grateful for this body and all it does for me.",
      "Health is my natural state. I return to it now.",
      "I feel alive. I feel strong. I feel well.",
    ],
    closing: [
      "Send gratitude to your body. It hears you.",
      "Today, you move through the world in radiant health.",
      "And so it is. Your body is whole and well.",
    ],
  },
  relationship: {
    title: "Opening to Love",
    opening: [
      "Breathe into your heart. Feel it soften and open.",
      "Love is not something you find. It is something you embody.",
      "You are worthy of deep, soul-nourishing connection.",
    ],
    affirmations: [
      "I am worthy of a love that is deep, true, and lasting.",
      "My heart is open to giving and receiving love freely.",
      "I attract people who see me, honor me, and cherish me.",
      "I release the past. I welcome love that is meant for me.",
      "I am a magnet for healthy, beautiful relationships.",
      "Love flows to me easily and naturally.",
      "I am enough — exactly as I am — for the right person.",
      "I give love without expectation, and receive it without fear.",
      "My relationships are sacred. I nurture them with presence.",
      "I am surrounded by love — in my friendships, my family, my romance.",
    ],
    closing: [
      "Feel the warmth in your chest. That is love, already present.",
      "Today, you move through the world as love itself.",
      "And so it is. Your heart is open and ready.",
    ],
  },
  power: {
    title: "Embodying Power",
    opening: [
      "Stand tall. Breathe deep. Feel your own strength.",
      "Power is not domination. It is alignment with your truth.",
      "You were born powerful. Today, you remember.",
    ],
    affirmations: [
      "I am powerful beyond measure.",
      "I stand in my truth without apology.",
      "My voice matters. My presence changes the room.",
      "I trust my instincts. I act with courage.",
      "I am the author of my life. I write the story.",
      "Fear does not control me. I move through it.",
      "I command respect by the way I honor myself.",
      "I am bold. I am decisive. I am unstoppable.",
      "My energy is sacred. I protect it fiercely.",
      "I step into my power fully, without hesitation.",
    ],
    closing: [
      "Feel the strength in your spine. That is you.",
      "Today, you walk as the powerful soul you are.",
      "And so it is. Your power is claimed.",
    ],
  },
  career: {
    title: "Career Alignment",
    opening: [
      "Breathe. Feel the alignment between your work and your purpose.",
      "Your career is not separate from your life. It is an expression of it.",
      "You are meant to do work that matters — and you will.",
    ],
    affirmations: [
      "I am aligned with work that fulfills and inspires me.",
      "My career is a reflection of my deepest values.",
      "I am recognized for my talents and contributions.",
      "Opportunities find me because I am ready for them.",
      "I trust the unfolding of my professional path.",
      "I work with people who uplift and challenge me.",
      "My work makes a positive impact on others.",
      "I am exactly where I need to be right now.",
      "Success is natural for me. It flows without force.",
      "I bring my full self to my work, and it shows.",
    ],
    closing: [
      "Feel the rightness of your path. You are on it.",
      "Today, you move closer to your highest professional expression.",
      "And so it is. Your career is aligned and thriving.",
    ],
  },
  promotion: {
    title: "Rising Higher",
    opening: [
      "Breathe upward. Feel yourself rising above where you were.",
      "You have outgrown your current level. The next is calling.",
      "Promotion is not luck. It is readiness meeting opportunity.",
    ],
    affirmations: [
      "I am ready for the next level of my career.",
      "My work is seen, valued, and rewarded.",
      "I rise naturally because I bring excellence to everything I do.",
      "Leadership recognizes my contribution and promotes me.",
      "I release competition. My path is mine alone, and it rises.",
      "I am the obvious choice for advancement.",
      "My skills grow daily, making me indispensable.",
      "I step into greater responsibility with confidence and grace.",
      "The universe orchestrates my elevation.",
      "I claim my promotion — energetically, it is already mine.",
    ],
    closing: [
      "Feel the elevation. You are already rising.",
      "Today, someone sees your readiness. Today, you ascend.",
      "And so it is. Your promotion is on its way.",
    ],
  },
  "stress-release": {
    title: "Releasing Stress",
    opening: [
      "Breathe out. Let the tension leave with your exhale.",
      "You do not need to carry it all. You can set it down.",
      "This moment is enough. You are enough. Right now.",
    ],
    affirmations: [
      "I release the tension I have been holding.",
      "My shoulders drop. My jaw softens. My breath deepens.",
      "I am safe in this moment. There is nothing to solve right now.",
      "I let go of what I cannot control.",
      "I trust that everything is working out for me.",
      "My body is relaxing, layer by layer, breath by breath.",
      "I give myself permission to rest.",
      "The pressure I feel is temporary. This too shall pass.",
      "I am calm. I am centered. I am at peace.",
      "I choose ease over effort. Flow over force.",
    ],
    closing: [
      "Feel the lightness. You have set down what was not yours to carry.",
      "Today, you move with ease and grace.",
      "And so it is. You are relaxed and at peace.",
    ],
  },
  anxiety: {
    title: "Calming Anxiety",
    opening: [
      "Breathe slowly. Count: in for four, hold for four, out for six.",
      "You are safe. This feeling will pass. You are not in danger.",
      "Your nervous system is recalibrating. You are okay.",
    ],
    affirmations: [
      "I am safe in this moment, in this body, in this place.",
      "My breath calms my mind. My mind calms my body.",
      "I release the need to control the uncontrollable.",
      "I have survived every anxious moment. I will survive this one too.",
      "This feeling is a wave. I let it wash over me and pass.",
      "I am grounded. I am present. I am here, now.",
      "My thoughts are just thoughts. They are not facts.",
      "I trust my body to find its balance.",
      "Peace is my natural state. I return to it now.",
      "I am okay. I am okay. I am okay.",
    ],
    closing: [
      "Feel the stillness settling in. You are safe.",
      "Today, you move through the world with calm and clarity.",
      "And so it is. You are at peace.",
    ],
  },
  worries: {
    title: "Releasing Worries",
    opening: [
      "Breathe. Notice the worries without gripping them.",
      "Worry is a prayer for what you don't want. Let's change the prayer.",
      "You cannot control the future. You can choose peace now.",
    ],
    affirmations: [
      "I release my worries to something greater than myself.",
      "I trust the unfolding of my life.",
      "What I worry about rarely comes to pass. I let it go.",
      "I focus on what I can control: my breath, my choice, my now.",
      "Faith is stronger than fear. I choose faith.",
      "I surrender the outcome. I trust the process.",
      "My mind is clear. My heart is light. My path is guided.",
      "I have everything I need for this moment.",
      "The future will take care of itself. I take care of now.",
      "I am held. I am guided. I am safe.",
    ],
    closing: [
      "Feel the release. The weight is lighter now.",
      "Today, you trust more and worry less.",
      "And so it is. You are free from worry.",
    ],
  },
  "anti-negative": {
    title: "Clearing Negativity",
    opening: [
      "Breathe in light. Breathe out anything that is not yours.",
      "You are the guardian of your energy. Today, you guard it well.",
      "Negativity cannot cling to a heart filled with light.",
    ],
    affirmations: [
      "I release all negativity that has attached to me.",
      "My energy is my own. I protect it with intention.",
      "I am surrounded by a shield of golden light.",
      "Negativity passes through me without sticking.",
      "I cleanse my mind, my body, my space.",
      "I choose thoughts that uplift and empower me.",
      "I distance myself from what drains me.",
      "I am a beacon of positivity. Darkness dissolves in my presence.",
      "My aura is bright, clear, and protected.",
      "I return all energy that is not mine to its source with love.",
    ],
    closing: [
      "Feel the clarity. Your energy is clean and yours.",
      "Today, you move through the world shielded and bright.",
      "And so it is. You are clear and protected.",
    ],
  },
  custom: {
    title: "Daily Positivity",
    opening: [
      "Breathe in. Feel the possibility of this new day.",
      "You are the creator of your experience. Today, you create well.",
      "Everything you need is already within you.",
    ],
    affirmations: [
      "I am exactly where I need to be.",
      "I trust myself and the path I am on.",
      "Today is full of opportunities for joy and growth.",
      "I am worthy of all the good things coming my way.",
      "I choose positivity, even when it is not easy.",
      "My energy attracts beautiful experiences today.",
      "I am grateful for this life and all its gifts.",
      "I let go of what was. I welcome what is becoming.",
      "I am calm, capable, and confident.",
      "Good things are finding me right now.",
    ],
    closing: [
      "Feel the positivity settling into your being.",
      "Today, you walk forward with an open heart and clear mind.",
      "And so it is. Your day is blessed.",
    ],
  },
};

/** Generate a template-based positivity script. */
export function generateTemplateScript(
  category: PositivityCategory,
  intention: string
): PositivityScript {
  const template = TEMPLATES[category] || TEMPLATES.custom;

  // Personalize the opening with the user's intention
  const personalizedOpening = intention.trim()
    ? [
        `You are here for: ${intention.trim()}.`,
        ...template.opening.slice(1),
      ]
    : template.opening;

  const lines: PositivityLine[] = [
    ...personalizedOpening.map((text) => ({ text, durationSec: 9 })),
    ...template.affirmations.map((text) => ({ text, durationSec: 8 })),
    ...template.closing.map((text) => ({ text, durationSec: 10 })),
  ];

  return {
    category,
    title: template.title,
    intention: intention.trim() || template.title,
    lines,
    totalDurationSec: lines.reduce((sum, l) => sum + l.durationSec, 0),
    source: "template",
  };
}

/* ============================================================
   LLM-BASED SCRIPT GENERATOR (OpenRouter free models)
   ============================================================ */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function generateLLMScript(
  category: PositivityCategory,
  intention: string
): Promise<PositivityScript | null> {
  if (!OPENROUTER_API_KEY) return null;

  const catMeta = POSITIVITY_CATEGORIES.find((c) => c.id === category);
  const catName = catMeta?.label || "positivity";

  const system = `You are Lumina, a master of positive psychology, affirmation science, and mindfulness meditation.
You create positivity recitation scripts that people read aloud to start their day with intention and power.
Your scripts are poetic, grounding, and emotionally resonant — never generic or cliché.
Each line should feel like a breath. The progression moves from grounding → affirmation → integration.
Return ONLY the script lines, one per line, no numbering, no markdown, no commentary.
Produce 12-15 lines total. Each line should take 6-10 seconds to recite slowly.`;

  const user = `Create a positivity script for someone seeking: ${catName}
Their specific intention: "${intention || "general positivity and alignment"}"

Structure:
- Lines 1-3: Grounding and opening (slower, spacious)
- Lines 4-12: Core affirmations (direct, powerful, personal)
- Lines 13-15: Integration and closing (sealing the practice)

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

      const lines: PositivityLine[] = rawLines.slice(0, 15).map((line: string, i: number) => ({
        text: line.replace(/^["']|["']$/g, ""),
        durationSec: i < 3 ? 9 : i >= rawLines.length - 3 ? 10 : 8,
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
  intention: string
): Promise<PositivityScript> {
  // Tier 1: Try LLM
  const llmScript = await generateLLMScript(category, intention);
  if (llmScript) return llmScript;

  // Tier 2: Template fallback
  return generateTemplateScript(category, intention);
}
