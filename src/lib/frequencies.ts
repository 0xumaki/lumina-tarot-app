/**
 * Intention → Frequency mapping.
 * Auto-detects an intention from free text (question / goal) and returns a
 * recommended carrier frequency + binaural beat. Powers both the Frequency
 * module and the manifestation frequency suggestions.
 *
 * Frequencies follow the common Solfeggio / spiritual-tuning associations.
 */

export type IntentionKey =
  | "abundance"
  | "love"
  | "healing"
  | "intuition"
  | "transformation"
  | "protection"
  | "clarity"
  | "peace"
  | "creativity"
  | "spiritual-growth"
  | "confidence"
  | "release";

export interface FrequencyPreset {
  key: IntentionKey;
  label: string;
  glyph: string;
  carrierHz: number;       // main audible tone
  binauralBeatHz: number;  // difference between ears (brainwave target)
  beatType: BrainwaveType;
  color: string;           // hex accent
  affirmation: string;
  keywords: string[];
  description: string;
}

export type BrainwaveType =
  | "delta"    // 0.5–4 Hz — deep sleep, healing
  | "theta"    // 4–8 Hz — meditation, intuition, creativity
  | "alpha"    // 8–14 Hz — relaxed focus, calm
  | "beta"     // 14–30 Hz — alert, active thinking
  | "gamma";   // 30–100 Hz — insight, high cognition

export const FREQUENCY_PRESETS: FrequencyPreset[] = [
  {
    key: "abundance",
    label: "Financial Abundance",
    glyph: "888",
    carrierHz: 888,
    binauralBeatHz: 7.83, // Schumann resonance — "earth's heartbeat", grounding for manifestation
    beatType: "theta",
    color: "#C5A87C",
    affirmation: "Wealth flows to me with ease and grace.",
    keywords: ["money", "wealth", "abundance", "rich", "financial", "prosperity", "income", "salary", "business", "success", "career", "job", "raise", "promotion", "cash", "afford", "million", "trillion"],
    description:
      "888 Hz — the frequency of infinite flow. Tune the body to abundance and dissolve scarcity.",
  },
  {
    key: "love",
    label: "Love & Connection",
    glyph: "639",
    carrierHz: 639,
    binauralBeatHz: 10, // alpha — calm openness, heart coherence
    beatType: "alpha",
    color: "#E89AAE",
    affirmation: "I give and receive love freely.",
    keywords: ["love", "relationship", "partner", "soulmate", "marriage", "romance", "heart", "date", "dating", "ex", "crush", "attraction", "connection", "family", "friend", "forgive", "reconcile"],
    description:
      "639 Hz — reconnects relationships, harmonizes the heart, and invites resonant love.",
  },
  {
    key: "healing",
    label: "Healing & Repair",
    glyph: "528",
    carrierHz: 528,
    binauralBeatHz: 4, // theta — healing & repair
    beatType: "theta",
    color: "#7AC9A8",
    affirmation: "My body knows how to heal, and it is healing now.",
    keywords: ["heal", "healing", "health", "sick", "illness", "pain", "recover", "recovery", "body", "wellness", "energy", "tired", "fatigue", "disease", "cure", "repair", "sleep"],
    description:
      "528 Hz — the 'miracle' tone of DNA repair, transformation, and physical restoration.",
  },
  {
    key: "intuition",
    label: "Intuition & Insight",
    glyph: "852",
    carrierHz: 852,
    binauralBeatHz: 7, // theta — intuition
    beatType: "theta",
    color: "#9E8AC9",
    affirmation: "I trust the quiet knowing within me.",
    keywords: ["intuition", "intuit", "guidance", "gut", "feeling", "sense", "know", "inner voice", "third eye", "psychic", "insight", "sign", "omen", "dream", "symbol", "signs"],
    description:
      "852 Hz — awakens inner knowing and intuition, reconnecting you to your inner compass.",
  },
  {
    key: "transformation",
    label: "Transformation",
    glyph: "741",
    carrierHz: 741,
    binauralBeatHz: 6, // theta
    beatType: "theta",
    color: "#C98AB5",
    affirmation: "I release what was and become who I truly am.",
    keywords: ["change", "transform", "transformation", "shift", "become", "new", "begin", "start over", "reinvent", "evolve", "grow", "awaken", "rebirth", "renew", "transition", "move"],
    description:
      "741 Hz — dissolves toxins, cleanses the cell, and empowers change and self-expression.",
  },
  {
    key: "protection",
    label: "Protection & Shielding",
    glyph: "174",
    carrierHz: 174,
    binauralBeatHz: 8, // alpha — steady calm shield
    beatType: "alpha",
    color: "#8AA8C9",
    affirmation: "I am safe, grounded, and shielded in light.",
    keywords: ["protect", "protection", "safe", "safety", "shield", "guard", "secure", "defend", "ward", "evil eye", "negativity", "fear", "anxiety", "danger", "boundaries"],
    description:
      "174 Hz — the natural anesthetic; a steady frequency of safety, grounding, and relief from pain.",
  },
  {
    key: "clarity",
    label: "Clarity & Focus",
    glyph: "7.83",
    carrierHz: 432,
    binauralBeatHz: 14, // low beta — focused calm
    beatType: "beta",
    color: "#C9D58A",
    affirmation: "My mind is clear, sharp, and calm.",
    keywords: ["clarity", "clear", "focus", "decision", "decide", "choose", "choice", "understand", "understanding", "truth", "know", "mind", "think", "study", "exam", "work", "concentrate", "remember"],
    description:
      "432 Hz — the universe's natural tuning. Resonant, mathematically consistent, deeply clarifying.",
  },
  {
    key: "peace",
    label: "Peace & Calm",
    glyph: "396",
    carrierHz: 396,
    binauralBeatHz: 5, // theta — emotional release
    beatType: "theta",
    color: "#8AC9C0",
    affirmation: "I am at peace, here and now.",
    keywords: ["peace", "calm", "relax", "relaxation", "stress", "anxiety", "anxious", "worry", "worried", "fear", "panic", "overwhelm", "rest", "still", "quiet", "serene", "let go", "breathe"],
    description:
      "396 Hz — liberates fear and guilt, turning grief into joy and restoring peace.",
  },
  {
    key: "creativity",
    label: "Creativity & Flow",
    glyph: "417",
    carrierHz: 417,
    binauralBeatHz: 9, // alpha — flow state
    beatType: "alpha",
    color: "#C9A88A",
    affirmation: "Creative energy moves through me without resistance.",
    keywords: ["create", "creativity", "creative", "art", "artwork", "write", "writing", "music", "song", "design", "idea", "inspire", "inspiration", "imagine", "imagination", "flow", "express", "expression"],
    description:
      "417 Hz — facilitates change and undoes difficult situations; sparks creative flow.",
  },
  {
    key: "spiritual-growth",
    label: "Spiritual Growth",
    glyph: "963",
    carrierHz: 963,
    binauralBeatHz: 7.5, // theta
    beatType: "theta",
    color: "#B58AC9",
    affirmation: "I am one with the divine order of all things.",
    keywords: ["spirit", "spiritual", "soul", "divine", "god", "universe", "cosmic", "cosmos", "higher self", "ascend", "ascension", "oneness", "unity", "sacred", "prayer", "meditate", "meditation", "purpose", "calling"],
    description:
      "963 Hz — the frequency of divine connection; tunes the crown to unity consciousness.",
  },
  {
    key: "confidence",
    label: "Confidence & Power",
    glyph: "528",
    carrierHz: 528,
    binauralBeatHz: 18, // beta — activation
    beatType: "beta",
    color: "#C97A5A",
    affirmation: "I move through the world with grounded, quiet power.",
    keywords: ["confidence", "confident", "power", "powerful", "strong", "strength", "courage", "courageous", "brave", "bold", "speak", "voice", "leader", "leadership", "win", "victory", "worth", "worthy", "self-esteem"],
    description:
      "528 Hz + 18 Hz beta — activates the body and clears the doubt that blocks your power.",
  },
  {
    key: "release",
    label: "Release & Let Go",
    glyph: "396",
    carrierHz: 396,
    binauralBeatHz: 3, // delta — deep release
    beatType: "delta",
    color: "#7A8680",
    affirmation: "I release what no longer serves me with gratitude.",
    keywords: ["release", "let go", "forgive", "forgiveness", "grief", "grieve", "loss", "mourning", "anger", "resentment", "regret", "guilt", "shame", "move on", "closure", "acceptance", "surrender"],
    description:
      "396 Hz + delta — dissolves the deepest held emotion, allowing true release.",
  },
];

export function getPreset(key: IntentionKey): FrequencyPreset {
  return FREQUENCY_PRESETS.find((p) => p.key === key) || FREQUENCY_PRESETS[0];
}

export function detectIntention(text: string): FrequencyPreset {
  const lower = text.toLowerCase();
  let best: FrequencyPreset = FREQUENCY_PRESETS[0];
  let bestScore = 0;
  for (const preset of FREQUENCY_PRESETS) {
    let score = 0;
    for (const kw of preset.keywords) {
      if (lower.includes(kw)) {
        // Longer keyword matches weigh more (more specific).
        score += kw.length > 6 ? 3 : 2;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = preset;
    }
  }
  if (bestScore === 0) {
    // Default to clarity for a tarot question, peace otherwise.
    best = getPreset("clarity");
  }
  return best;
}

export const BRAINWAVE_LABELS: Record<BrainwaveType, string> = {
  delta: "Delta · Deep healing & sleep",
  theta: "Theta · Meditation & intuition",
  alpha: "Alpha · Calm focus",
  beta: "Beta · Alert clarity",
  gamma: "Gamma · Insight",
};

/* ============================================================
   SECRET FREQUENCIES — unlocked when ALL 36 achievements are complete.
   These are the three crown jewels of the Solfeggio scale, reserved
   for Luminaries who have walked the full path.
   ============================================================ */

export interface SecretFrequencyPreset {
  key: string;
  label: string;
  subtitle: string;
  glyph: string;
  carrierHz: number;
  binauralBeatHz: number;
  beatType: BrainwaveType;
  color: string;
  affirmation: string;
  description: string;
  blessing: string;
}

export const SECRET_FREQUENCIES: SecretFrequencyPreset[] = [
  {
    key: "secret-963",
    label: "963 Hz",
    subtitle: "God Frequency",
    glyph: "✶",
    carrierHz: 963,
    binauralBeatHz: 7.83,
    beatType: "theta",
    color: "#E7D2A8",
    affirmation: "I am one with the divine source.",
    description: "The frequency of divine connection — the crown of the Solfeggio scale. Said to reconnect you to the spiritual order of the universe and activate the pineal gland.",
    blessing: "Unlocked for Luminaries who have completed all 36 achievements. Use in stillness, with an open crown.",
  },
  {
    key: "secret-432",
    label: "432 Hz",
    subtitle: "Cosmic Resonance",
    glyph: "◉",
    carrierHz: 432,
    binauralBeatHz: 4.0,
    beatType: "theta",
    color: "#9E8AC9",
    affirmation: "I resonate with the harmony of the cosmos.",
    description: "The natural tuning of the universe — said to be mathematically consistent with the patterns of the golden ratio, the Earth's heartbeat, and the human body.",
    blessing: "Unlocked for Luminaries who have completed all 36 achievements. A grounding, expansive tone for deep meditation.",
  },
  {
    key: "secret-528",
    label: "528 Hz",
    subtitle: "Miracle DNA Repair",
    glyph: "✦",
    carrierHz: 528,
    binauralBeatHz: 8.0,
    beatType: "alpha",
    color: "#B5CD7E",
    affirmation: "My body, mind, and spirit heal and renew.",
    description: "The 'Miracle Tone' of the Solfeggio scale — associated with DNA repair, transformation, and miracles. Said to bring the body back into natural harmony.",
    blessing: "Unlocked for Luminaries who have completed all 36 achievements. Use for healing, restoration, and renewal.",
  },
];
