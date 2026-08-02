import { TAROT_DECK, type TarotCard } from "@/lib/tarot-data";

export interface DrawnCard {
  id: string;
  reversed: boolean;
  position?: string;
  positionIndex?: number;
}

export interface DrawnCardWithMeta extends DrawnCard {
  card: TarotCard;
}

/** Fisher–Yates shuffle returning a new array. */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Draw `count` unique cards from the full deck, each with a ~40% chance of
 * being reversed (matching real tarot practice).
 */
export function drawCards(count: number, positions?: string[]): DrawnCard[] {
  const shuffled = shuffle(TAROT_DECK);
  const drawn = shuffled.slice(0, count);
  return drawn.map((card, i) => ({
    id: card.id,
    reversed: Math.random() < 0.4,
    position: positions?.[i],
    positionIndex: i,
  }));
}

export function attachMeta(drawn: DrawnCard[]): DrawnCardWithMeta[] {
  return drawn.map((d) => {
    const card = TAROT_DECK.find((c) => c.id === d.id);
    if (!card) throw new Error(`Unknown card id: ${d.id}`);
    return { ...d, card };
  });
}

/** Format the cards into a rich text summary for the LLM — NO keywords, full imagery context. */
export function summarizeDrawn(drawn: DrawnCardWithMeta[]): string {
  return drawn
    .map((d, i) => {
      const pos = d.position ? `${i + 1}. ${d.position}` : `${i + 1}.`;
      const orientation = d.reversed ? "Reversed" : "Upright";
      const c = d.card;
      // Provide rich context: card name, orientation, element, astrology, numerology,
      // visual description (symbol), and meaning — but NOT as keywords.
      // The LLM should weave these into narrative, not list them.
      const context = [
        `Card: ${c.name} (${orientation})`,
        c.element ? `Element: ${c.element}` : null,
        c.astrology ? `Astrology: ${c.astrology}` : null,
        c.numerology ? `Numerology: ${c.numerology}` : null,
        c.symbol ? `Visual symbol: ${c.symbol}` : null,
        `Meaning: ${d.reversed ? c.meaningReversed : c.meaningUpright}`,
        `Affirmation: ${c.affirmation}`,
      ].filter(Boolean).join("\n  ");
      return `${pos}\n  ${context}`;
    })
    .join("\n\n");
}

/** Aggregate yes/no tallies for the yes-no spread. */
export function tallyYesNo(drawn: DrawnCardWithMeta[]): {
  yes: number;
  no: number;
  maybe: number;
  answer: "yes" | "no" | "maybe";
  confidence: number;
} {
  let yes = 0,
    no = 0,
    maybe = 0;
  for (const d of drawn) {
    const v = d.reversed ? d.card.yesNoReversed : d.card.yesNoUpright;
    if (v === "yes") yes++;
    else if (v === "no") no++;
    else maybe++;
  }
  const total = drawn.length || 1;
  let answer: "yes" | "no" | "maybe" = "maybe";
  if (yes > no && yes > maybe) answer = "yes";
  else if (no > yes && no > maybe) answer = "no";
  const confidence = Math.round((Math.max(yes, no, maybe) / total) * 100);
  return { yes, no, maybe, answer, confidence };
}
