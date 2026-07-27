import ZAI from "z-ai-web-dev-sdk";
import { summarizeDrawn, tallyYesNo, type DrawnCardWithMeta } from "@/lib/tarot";

/**
 * AI tarot interpretation using z-ai-web-dev-sdk LLM.
 * - Free (Yes/No + Single): concise — a direct yes/no verdict + 1-2 line meaning.
 * - Premium: deep multi-paragraph reading with per-card analysis.
 */

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

export async function interpretReading(
  question: string,
  spreadType: string,
  drawn: DrawnCardWithMeta[],
  isPremium: boolean
): Promise<string> {
  try {
    const zai = await ZAI.create();
    const messages = buildMessages(question, spreadType, drawn, isPremium);
    const completion = await zai.chat.completions.create({
      messages: messages as any,
      temperature: 0.85,
      maxTokens: isPremium ? 1400 : 220,
    });
    const text = completion.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Empty LLM response");
    return text;
  } catch (err) {
    console.error("LLM interpretation failed:", err);
    // Graceful fallback so the reading still lands.
    return fallbackInterpretation(question, spreadType, drawn, isPremium);
  }
}

function fallbackInterpretation(
  _question: string,
  spreadType: string,
  drawn: DrawnCardWithMeta[],
  isPremium: boolean
): string {
  if (spreadType === "yes-no") {
    const tally = tallyYesNo(drawn);
    const c = drawn[0].card;
    const orient = drawn[0].reversed ? "reversed" : "upright";
    const meaning = drawn[0].reversed ? c.meaningReversed : c.meaningUpright;
    return `${tally.answer.toUpperCase()} — ${c.name} ${orient}. ${meaning}`;
  }
  if (!isPremium) {
    const c = drawn[0].card;
    const meaning = drawn[0].reversed ? c.meaningReversed : c.meaningUpright;
    return meaning;
  }
  // Premium fallback — assemble per-card meanings.
  const lines = drawn.map((d, i) => {
    const pos = d.position ? `**${d.position}** — ` : `**Card ${i + 1}** — `;
    const meaning = d.reversed ? d.card.meaningReversed : d.card.meaningUpright;
    return `${pos}${d.card.name} (${d.reversed ? "Reversed" : "Upright"}): ${meaning}`;
  });
  return lines.join("\n\n");
}
