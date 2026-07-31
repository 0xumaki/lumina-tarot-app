"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Shuffle, History, Lock, ChevronRight, X, RefreshCw, Loader2, Share2, Check, Copy, Bookmark, BookmarkCheck, AudioLines } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { useHaptics } from "@/hooks/use-haptics";
import { useShare } from "@/hooks/use-share";
import { useSound } from "@/hooks/use-sound";
import { useRitual } from "@/hooks/use-ritual";
import { detectIntention, FREQUENCY_PRESETS, type FrequencyPreset } from "@/lib/frequencies";
import { SPREADS, type SpreadType } from "@/lib/limits";
import { TarotCardFace, TarotCardBack } from "./tarot-card-face";
import { CardDetailModal } from "./card-detail-modal";
import {
  GlassCard,
  GoldButton,
  GhostButton,
  Pill,
  SectionTitle,
  Divider,
} from "@/components/lumina/primitives";
import { useAppStore } from "@/lib/store";
import { PremiumModal } from "@/features/premium/premium-modal";
import type { TarotCard } from "@/lib/tarot-data";

type Reading = {
  id: string;
  question: string;
  spreadType: SpreadType;
  cards: { id: string; reversed: boolean; position?: string; card: any }[];
  interpretation: string;
  createdAt: string;
  saved?: boolean;
};

export function TarotView({ isPremium, remaining }: { isPremium: boolean; remaining: number | null }) {
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const setTab = useAppStore((s) => s.setTab);
  const setPending = useAppStore((s) => s.setPendingPremiumAction);
  const [premiumOpen, setPremiumOpen] = React.useState(false);

  const [question, setQuestion] = React.useState("");
  const [spread, setSpread] = React.useState<SpreadType>(isPremium ? "three-card" : "yes-no");
  const [phase, setPhase] = React.useState<"ask" | "shuffling" | "revealing" | "result">("ask");
  const [reading, setReading] = React.useState<Reading | null>(null);
  const [revealedIdx, setRevealedIdx] = React.useState(0);
  const [showHistory, setShowHistory] = React.useState(false);
  const [detailCard, setDetailCard] = React.useState<{ card: TarotCard; reversed: boolean } | null>(null);

  const currentSpread = SPREADS.find((s) => s.id === spread)!;
  const haptics = useHaptics();
  const sound = useSound();
  const { markStep } = useRitual();

  async function performReading() {
    if (!question.trim()) {
      toast({ title: "Ask a question first", description: "The cards respond to your intention." });
      return;
    }
    setPhase("shuffling");
    setReading(null);
    setRevealedIdx(0);
    haptics("draw");
    sound("shuffle");

    // Minimum shuffle animation time for ritual feel
    const minDelay = new Promise((r) => setTimeout(r, 2200));
    try {
      const res = await api("/api/tarot/read", {
        method: "POST",
        body: JSON.stringify({ question: question.trim(), spreadType: spread }),
      });
      const data = await res.json();
      await minDelay;
      if (!res.ok) {
        setPhase("ask");
        if (data.error === "premium-required" || data.error === "limit-reached") {
          if (data.error === "premium-required") {
            setPending(data.message);
            setPremiumOpen(true);
          } else {
            toast({ title: "Daily limit reached", description: data.message });
          }
        } else {
          toast({ title: "Could not read", description: data.error || data.message });
        }
        return;
      }
      setReading(data.reading);
      setPhase("revealing");
      // Invalidate me + ritual so achievement hook detects new unlocks immediately
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["ritual"] });
      // Reveal cards one by one
      const total = data.reading.cards.length;
      for (let i = 0; i < total; i++) {
        await new Promise((r) => setTimeout(r, 650));
        setRevealedIdx(i + 1);
        haptics("reveal");
        sound("flip");
      }
      await new Promise((r) => setTimeout(r, 400));
      setPhase("result");
      haptics("complete");
      markStep(3); // Mark ritual step 3 (Ask the cards) — optional step
    } catch (e: any) {
      setPhase("ask");
      toast({ title: "Connection issue", description: e.message });
    }
  }

  function reset() {
    setPhase("ask");
    setReading(null);
    setRevealedIdx(0);
    setQuestion("");
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="The Cards"
        title={<>Draw your <span className="lum-text-gold">reading</span></>}
        subtitle={
          remaining === null
            ? "Premium · unlimited questions, all spreads."
            : `${remaining} free question${remaining === 1 ? "" : "s"} remaining today.`
        }
      />

      <AnimatePresence mode="wait">
        {phase === "ask" && (
          <motion.div
            key="ask"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Premium question card — no ShellCard, refined glass design */}
            <div className="lum-glass rounded-2xl p-5 relative overflow-hidden">
              {/* Subtle gold glow */}
              <div
                className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(197,168,124,0.08), transparent 70%)" }}
              />
              <div className="relative space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] uppercase tracking-[0.18em] text-gold/70 font-medium">
                      Your question
                    </label>
                    {question.trim().length > 0 && (
                      <span className={`text-[10px] tabular-nums ${
                        question.trim().length < 8 ? "text-ink-muted" : "text-gold/60"
                      }`}>
                        {question.trim().length < 8 ? `${question.trim().length}/8 min` : "✓ focused"}
                      </span>
                    )}
                  </div>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="What does your heart need to know?"
                    rows={2}
                    className="mt-2 w-full bg-transparent resize-none text-[16px] leading-[24px] text-ink placeholder:text-ink-muted/70 focus:outline-none"
                  />
                  {/* #10: Smart question suggestions */}
                  {question.trim().length === 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {getSmartQuestions().map((q, i) => (
                        <button
                          key={i}
                          onClick={() => setQuestion(q)}
                          className="rounded-full px-2.5 py-1 text-[10px] text-ink-muted border border-white/8 bg-white/[0.02] hover:text-gold hover:border-gold/20 transition-colors"
                        >
                          {q.length > 40 ? q.slice(0, 40) + "…" : q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Divider />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[11px] uppercase tracking-[0.18em] text-gold/70 font-medium">
                      Spread
                    </label>
                    <Pill variant="gold">
                      {remaining === null ? "Premium" : `${remaining} left`}
                    </Pill>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {SPREADS.map((s) => {
                      const locked = !isPremium && s.premium;
                      const isSelected = spread === s.id;
                      // Mini card icons showing the spread layout
                      const cardIcons = Array.from({ length: Math.min(s.cardCount, 5) }, (_, i) => i);
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            if (locked) {
                              setPending(`${s.name} is a Premium spread.`);
                              setPremiumOpen(true);
                              return;
                            }
                            setSpread(s.id);
                          }}
                          className={`relative text-left rounded-2xl p-3.5 border transition-all overflow-hidden ${
                            isSelected
                              ? "border-gold/50 bg-gold/[0.08] shadow-[0_0_20px_-4px_rgba(197,168,124,0.2)]"
                              : "border-white/6 bg-white/[0.015] hover:border-white/15 hover:bg-white/[0.03]"
                          }`}
                        >
                          {/* Selected gradient glow */}
                          {isSelected && (
                            <div
                              className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
                              style={{ background: "radial-gradient(circle, rgba(197,168,124,0.12), transparent 70%)" }}
                            />
                          )}

                          {/* Top row: card-count visualization + status badge */}
                          <div className="flex items-center justify-between mb-2.5">
                            {/* Mini card stack visualization */}
                            <div className="flex items-center gap-0.5">
                              {cardIcons.map((i) => (
                                <div
                                  key={i}
                                  className={`rounded-sm transition-all ${
                                    isSelected
                                      ? "bg-gold/40 border-gold/30"
                                      : "bg-white/10 border-white/5"
                                  }`}
                                  style={{
                                    width: 8,
                                    height: 12,
                                    borderWidth: 1,
                                    marginLeft: i > 0 ? -3 : 0,
                                    zIndex: cardIcons.length - i,
                                  }}
                                />
                              ))}
                              {s.cardCount > 5 && (
                                <span className={`text-[9px] ml-1 ${isSelected ? "text-gold/70" : "text-ink-muted"}`}>
                                  +{s.cardCount - 5}
                                </span>
                              )}
                            </div>

                            {/* Status badge */}
                            {isSelected ? (
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#E7D2A8] to-[#C5A87C] flex items-center justify-center shadow-[0_0_8px_rgba(197,168,124,0.5)]">
                                <Check className="w-3 h-3 text-black" strokeWidth={3} />
                              </div>
                            ) : locked ? (
                              <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                <Lock className="w-2.5 h-2.5 text-ink-muted" />
                              </div>
                            ) : null}
                          </div>

                          {/* Card name */}
                          <div className={`text-[13px] font-medium leading-[16px] ${
                            isSelected ? "text-gold" : "text-ink"
                          }`}>
                            {s.name}
                          </div>

                          {/* Meta line */}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[11px] ${isSelected ? "text-gold/70" : "text-ink-muted"}`}>
                              {s.cardCount} card{s.cardCount > 1 ? "s" : ""}
                            </span>
                            <span className="text-ink-muted/40">·</span>
                            <span className={`text-[11px] ${
                              s.premium
                                ? locked ? "text-ink-muted/60" : "text-gold/70"
                                : "text-leaf/70"
                            }`}>
                              {s.premium ? "Premium" : "Free"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Spread description — animated swap */}
                  <div className="mt-2.5 px-1">
                    <p className="text-[12px] text-ink-muted leading-[16px]">
                      {currentSpread.description}
                    </p>
                  </div>
                </div>
                <GoldButton onClick={performReading} className="w-full">
                  <Shuffle className="w-4 h-4" />
                  Shuffle &amp; Draw
                </GoldButton>
                <GhostButton onClick={() => setShowHistory(true)} className="w-full">
                  <History className="w-4 h-4" />
                  Reading History
                </GhostButton>
              </div>
            </div>

            <SpreadHint spread={currentSpread.id} />
          </motion.div>
        )}

        {phase === "shuffling" && (
          <motion.div
            key="shuffling"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="relative w-[180px] h-[270px]">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0"
                  animate={{
                    rotate: [0, i % 2 === 0 ? 12 : -12, 0],
                    x: [0, i % 2 === 0 ? 8 : -8, 0],
                    y: [0, -4, 0],
                  }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.1 }}
                  style={{ zIndex: 5 - i }}
                >
                  <TarotCardBack size="md" className="opacity-90" />
                </motion.div>
              ))}
            </div>
            <div className="mt-8 flex items-center gap-2 text-gold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[13px] tracking-[0.04em]">Shuffling the deck…</span>
            </div>
            <p className="text-[12px] text-ink-muted mt-2">Breathe. Hold your question lightly.</p>
          </motion.div>
        )}

        {(phase === "revealing" || phase === "result") && reading && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <GlassCard className="p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-gold/80 font-medium mb-1">
                Your question
              </div>
              <p className="text-[15px] leading-[21px] text-ink italic">"{reading.question}"</p>
            </GlassCard>

            <div className="flex flex-col items-center gap-5">
              {/* Hero card display — larger for single-card spreads */}
              <div className="flex flex-wrap items-end justify-center gap-3">
                {reading.cards.map((c, i) => {
                  const revealed = i < revealedIdx || phase === "result";
                  const isSolo = reading.cards.length === 1;
                  return (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <AnimatePresence mode="wait">
                        {revealed ? (
                          <motion.button
                            key="face"
                            initial={{ rotateY: 180, opacity: 0 }}
                            animate={{ rotateY: 0, opacity: 1 }}
                            transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
                            onClick={() => setDetailCard({ card: c.card, reversed: c.reversed })}
                            className="relative group"
                            aria-label={`View details for ${c.card.name}`}
                          >
                            <TarotCardFace card={c.card} reversed={c.reversed} size={isSolo ? "lg" : "md"} />
                            <div className="absolute inset-0 rounded-[14px] bg-gold/0 group-hover:bg-gold/10 transition-colors flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100">
                              <span className="text-[9px] uppercase tracking-[0.14em] text-gold font-medium">Tap for meaning</span>
                            </div>
                          </motion.button>
                        ) : (
                          <motion.div key="back" exit={{ opacity: 0 }}>
                            <TarotCardBack size={isSolo ? "lg" : "md"} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {c.position && (
                        <div className="text-[11px] uppercase tracking-[0.14em] text-ink-muted text-center max-w-[120px]">
                          {c.position}
                        </div>
                      )}
                      {revealed && (
                        <div className="text-[12px] text-ink text-center max-w-[160px] leading-[15px] font-medium">
                          {c.card.nameShort}
                          {c.reversed && <span className="text-gold/70"> · Reversed</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {phase === "result" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="w-full space-y-3"
                >
                  {/* Yes/No answer banner (for yes-no spread) */}
                  {reading.spreadType === "yes-no" && reading.interpretation && (
                    <YesNoBanner interpretation={reading.interpretation} />
                  )}

                  <div className="lum-glass rounded-2xl p-5 relative overflow-hidden">
                    {/* Gold glow accent */}
                    <div
                      className="absolute -top-12 -left-12 w-32 h-32 rounded-full pointer-events-none"
                      style={{ background: "radial-gradient(circle, rgba(197,168,124,0.06), transparent 70%)" }}
                    />
                    {/* Header with card name merged in */}
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-3.5 h-3.5 text-gold" />
                      <span className="text-[11px] uppercase tracking-[0.18em] text-gold/80 font-medium">
                        The Reading
                      </span>
                    </div>

                    {/* Card title row (replaces orphaned "THE ANSWER") */}
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/8">
                      <span className="text-xl leading-none">{reading.cards[0].card.symbol}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-medium text-ink leading-[17px]">
                          {reading.cards[0].card.name}
                          {reading.cards[0].reversed && (
                            <span className="text-gold/70 font-normal"> · Reversed</span>
                          )}
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.14em] text-ink-muted mt-0.5">
                          {reading.cards[0].card.arcana === "major" ? "Major Arcana" : `Minor · ${cap(reading.cards[0].card.suit)}`}
                        </div>
                      </div>
                    </div>

                    {/* Interpretation — strip the leading YES/NO/MAYBE for yes-no (it's in the banner) */}
                    <div className="text-[14px] leading-[23px] text-ink whitespace-pre-wrap">
                      <FormattedText
                        text={
                          reading.spreadType === "yes-no"
                            ? reading.interpretation.replace(/^(YES|NO|MAYBE)[.\s]*/i, "")
                            : reading.interpretation
                        }
                      />
                    </div>

                    {/* Tappable keywords */}
                    <Divider className="my-4" />
                    <div className="space-y-3">
                      {reading.cards.map((c, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <span className="text-lg leading-none mt-0.5">{c.card.symbol}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-medium text-ink">
                              {c.card.name}
                              {c.reversed && <span className="text-ink-muted"> (Reversed)</span>}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {(c.reversed ? c.card.keywordsReversed : c.card.keywordsUpright)
                                .slice(0, 4)
                                .map((k: string) => (
                                  <KeywordChip key={k} keyword={k} card={c.card} reversed={c.reversed} />
                                ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Affirmation with copy button */}
                    <Divider className="my-4" />
                    <AffirmationCard affirmation={reading.cards[0].card.affirmation} />
                  </div>

                  <div className="flex gap-2">
                    <GoldButton onClick={reset} className="flex-1">
                      <RefreshCw className="w-4 h-4" />
                      New Reading
                    </GoldButton>
                    <GhostButton onClick={() => setShowHistory(true)} className="flex-1">
                      <History className="w-4 h-4" />
                      History
                    </GhostButton>
                  </div>

                  <div className="flex gap-2">
                    <SaveButton readingId={reading.id} />
                    <ShareButton reading={reading} />
                  </div>

                  {/* Reading closure moment — gentle breathing prompt */}
                  <ReadingClosure cardName={reading.cards[0]?.card?.nameShort || "this card"} />

                  {/* Smart frequency suggestion — step 4 of the ritual */}
                  <SmartFrequencySuggestion
                    card={reading.cards[0]?.card}
                    reversed={reading.cards[0]?.reversed}
                    onNavigate={() => setTab("frequency")}
                  />
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <HistorySheet
        open={showHistory}
        onOpenChange={setShowHistory}
        onReread={(r) => {
          setReading(r);
          setRevealedIdx(r.cards.length);
          setPhase("result");
          setShowHistory(false);
        }}
      />
      <CardDetailModal
        card={detailCard?.card ?? null}
        reversed={detailCard?.reversed ?? false}
        open={!!detailCard}
        onOpenChange={(o) => !o && setDetailCard(null)}
      />
      <PremiumModal open={premiumOpen} onOpenChange={setPremiumOpen} />
    </div>
  );
}

/** #10: Smart question suggestions based on time of day */
function getSmartQuestions(): string[] {
  const hour = new Date().getHours();
  const base = [
    "What energy should I bring to today?",
    "What do I need to let go of?",
    "What is seeking to emerge in my life?",
  ];
  if (hour < 10) return ["What energy should I bring to this day?", ...base.slice(1)];
  if (hour < 17) return ["What should I focus on right now?", ...base.slice(1)];
  if (hour < 21) return ["What is this evening asking of me?", ...base.slice(0, 2)];
  return ["What should I release before sleep?", ...base.slice(0, 2)];
}

function SpreadHint({ spread }: { spread: SpreadType }) {
  const hints: Record<SpreadType, string> = {
    "yes-no": "A single card answers yes, no, or maybe — read the orientation.",
    single: "One card of focused guidance for your question.",
    "three-card": "Past, Present, Future — the arc of your situation.",
    relationship: "You, Them, the Bond between, and where it leads.",
    career: "Where you are, the challenge, your gift, the outcome.",
    "celtic-cross": "The ten-card Celtic Cross — the deepest, most layered reading.",
  };
  return (
    <GlassCard className="p-3.5">
      <div className="flex items-start gap-2.5">
        <Sparkles className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />
        <p className="text-[12px] leading-[17px] text-ink-muted">{hints[spread]}</p>
      </div>
    </GlassCard>
  );
}

/** Minimal markdown-ish formatter: **bold**, line breaks. */
function FormattedText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <React.Fragment key={i}>
            {parts.map((p, j) =>
              p.startsWith("**") && p.endsWith("**") ? (
                <strong key={j} className="font-medium text-ink">
                  {p.slice(2, -2)}
                </strong>
              ) : (
                <React.Fragment key={j}>{p}</React.Fragment>
              )
            )}
            {i < lines.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </>
  );
}

function HistorySheet({
  open,
  onOpenChange,
  onReread,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onReread: (r: Reading) => void;
}) {
  const api = useApi();
  const [items, setItems] = React.useState<Reading[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [tab, setTab] = React.useState<"all" | "saved">("all");

  const load = React.useCallback(
    (savedOnly: boolean) => {
      setLoading(true);
      api(`/api/tarot/history?limit=30${savedOnly ? "&saved=true" : ""}`)
        .then((r) => r.json())
        .then((d) => setItems(d.readings || []))
        .finally(() => setLoading(false));
    },
    [api]
  );

  React.useEffect(() => {
    if (open) load(tab === "saved");
  }, [open, tab, load]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => onOpenChange(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="relative w-full max-w-md max-h-[80vh] flex flex-col lum-glass-float rounded-t-[28px] sm:rounded-[28px] m-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-gold" />
                <h3 className="text-[15px] font-medium text-ink">Reading History</h3>
              </div>
              <button onClick={() => onOpenChange(false)} className="text-ink-muted hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab toggle */}
            <div className="flex gap-1 p-3 pb-1">
              {(["all", "saved"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded-lg py-1.5 text-[12px] font-medium tracking-wide transition-colors ${
                    tab === t
                      ? "bg-gold/15 text-gold border border-gold/30"
                      : "bg-white/[0.03] text-ink-muted border border-white/8 hover:text-ink"
                  }`}
                >
                  {t === "all" ? "All" : "Saved"}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto p-4 pt-2 space-y-2.5 lum-no-scrollbar">
              {loading ? (
                <div className="text-center py-8 text-ink-muted text-[13px]">Loading…</div>
              ) : items.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-3">
                    {tab === "saved" ? (
                      <Bookmark className="w-5 h-5 text-gold/60" />
                    ) : (
                      <History className="w-5 h-5 text-gold/60" />
                    )}
                  </div>
                  <div className="text-[14px] font-medium text-ink">
                    {tab === "saved" ? "No saved readings" : "No readings yet"}
                  </div>
                  <p className="text-[12px] text-ink-muted mt-1 max-w-[240px] mx-auto leading-[16px]">
                    {tab === "saved"
                      ? "Bookmark meaningful readings with the Save button, and they'll appear here."
                      : "Your first reading awaits. Ask the cards a question."}
                  </p>
                </div>
              ) : (
                items.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onReread(r)}
                    className="w-full text-left rounded-xl border border-white/8 bg-white/[0.02] p-3 hover:border-gold/30 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {r.cards.slice(0, 5).map((c, i) => (
                        <span key={i} className="text-base leading-none">
                          {c.card?.symbol}
                        </span>
                      ))}
                      <span className="ml-auto flex items-center gap-1.5">
                        {r.saved && <BookmarkCheck className="w-3 h-3 text-gold" />}
                        <span className="text-[10px] text-ink-muted">
                          {new Date(r.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </span>
                    </div>
                    <div className="text-[13px] text-ink line-clamp-1 mb-1">"{r.question}"</div>
                    <div className="text-[11px] text-ink-muted line-clamp-2 leading-[15px]">
                      {r.interpretation.replace(/\*\*/g, "")}
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gold">
                      <span className="uppercase tracking-[0.1em]">{r.spreadType.replace("-", " ")}</span>
                      <ChevronRight className="w-3 h-3" />
                      <span className="ml-auto text-ink-muted normal-case tracking-normal">Tap to re-read</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ShareButton({ reading }: { reading: Reading }) {
  const share = useShare();
  const { toast } = useToast();
  const haptics = useHaptics();
  const [shared, setShared] = React.useState(false);

  async function handleShare() {
    haptics("tap");
    const result = await share({
      question: reading.question,
      spreadType: reading.spreadType,
      cards: reading.cards.map((c) => ({
        name: c.card.name,
        reversed: c.reversed,
        position: c.position,
      })),
      interpretation: reading.interpretation,
    });
    if (result === "shared") {
      // native sheet opened — no toast needed
    } else if (result === "copied") {
      setShared(true);
      haptics("complete");
      toast({ title: "Copied to clipboard", description: "Your reading is ready to share." });
      setTimeout(() => setShared(false), 2500);
    } else {
      toast({ title: "Couldn't share", description: "Please try again." });
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[12px] text-gold/80 hover:text-gold tracking-wide transition-colors rounded-full border border-gold/20 hover:border-gold/40"
    >
      {shared ? <Check className="w-3.5 h-3.5 text-leaf" /> : <Share2 className="w-3.5 h-3.5" />}
      {shared ? "Copied!" : "Share"}
    </button>
  );
}

/** Save/bookmark a reading. */
function SaveButton({ readingId }: { readingId: string }) {
  const api = useApi();
  const { toast } = useToast();
  const haptics = useHaptics();
  const [saved, setSaved] = React.useState(false);

  async function toggle() {
    haptics("tap");
    try {
      const res = await api("/api/tarot/save", {
        method: "POST",
        body: JSON.stringify({ readingId }),
      });
      const data = await res.json();
      if (res.ok && data.reading) {
        setSaved(data.reading.saved);
        haptics(data.reading.saved ? "complete" : "tap");
        toast({
          title: data.reading.saved ? "Reading saved" : "Removed",
          description: data.reading.saved ? "Find it in your History." : undefined,
        });
      }
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[12px] tracking-wide transition-colors rounded-full border"
      style={{
        borderColor: saved ? "rgba(197,168,124,0.5)" : "rgba(255,255,255,0.1)",
        color: saved ? "#E7D2A8" : "#7A8680",
        background: saved ? "rgba(197,168,124,0.12)" : "transparent",
      }}
    >
      {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
      {saved ? "Saved" : "Save"}
    </button>
  );
}

/** Yes/No answer banner — prominent verdict for yes-no spread. */
function YesNoBanner({ interpretation }: { interpretation: string }) {
  const match = interpretation.match(/^(YES|NO|MAYBE)/i);
  if (!match) return null;
  const answer = match[1].toUpperCase();
  const config = {
    YES: { color: "#B5CD7E", bg: "rgba(181,205,126,0.12)", border: "rgba(181,205,126,0.35)", glyph: "✓", label: "Yes" },
    NO: { color: "#E89A4A", bg: "rgba(232,154,74,0.12)", border: "rgba(232,154,74,0.35)", glyph: "✕", label: "No" },
    MAYBE: { color: "#C5A87C", bg: "rgba(197,168,124,0.12)", border: "rgba(197,168,124,0.35)", glyph: "?", label: "Maybe" },
  }[answer] || { color: "#C5A87C", bg: "rgba(197,168,124,0.12)", border: "rgba(197,168,124,0.35)", glyph: "?", label: "Maybe" };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{ background: config.bg, border: `1px solid ${config.border}` }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-[18px] font-bold shrink-0"
        style={{ background: `${config.color}22`, border: `1.5px solid ${config.color}`, color: config.color }}
      >
        {config.glyph}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.18em] font-medium" style={{ color: config.color }}>
          The cards say
        </div>
        <div className="text-[20px] font-light text-ink leading-[24px]">{config.label}</div>
      </div>
    </motion.div>
  );
}

/** Tappable keyword chip — tap to see a micro-insight popover. */
function KeywordChip({ keyword, card, reversed }: { keyword: string; card: any; reversed: boolean }) {
  const [open, setOpen] = React.useState(false);
  const meaning = reversed ? card.meaningReversed : card.meaningUpright;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors border"
        style={{
          background: open ? "rgba(197,168,124,0.18)" : "rgba(255,255,255,0.04)",
          borderColor: open ? "rgba(197,168,124,0.5)" : "rgba(255,255,255,0.1)",
          color: open ? "#E7D2A8" : "#E8EBE9",
        }}
      >
        {keyword}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="absolute z-50 top-full mt-1.5 left-0 w-[220px] rounded-xl lum-glass-float p-3 text-left"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{card.symbol}</span>
                <span className="text-[11px] font-medium text-ink">{card.name}</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-gold/70 font-medium mb-1">
                {keyword}
              </div>
              <p className="text-[11px] leading-[15px] text-ink-muted">{meaning}</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Affirmation card with copy-to-clipboard. */
function AffirmationCard({ affirmation }: { affirmation: string }) {
  const [copied, setCopied] = React.useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(`"${affirmation}" — via Lumina`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  }
  return (
    <div className="rounded-xl bg-gold/[0.06] border border-gold/15 p-3.5">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-gold/70" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-gold/80 font-medium">
            Affirmation
          </span>
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[10px] text-gold/70 hover:text-gold transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-leaf" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="text-[14px] leading-[20px] text-ink italic">
        "{affirmation}"
      </p>
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Reading closure — a gentle "sit with this card" breathing prompt that completes the ritual arc. */
function ReadingClosure({ cardName }: { cardName: string }) {
  const [breathing, setBreathing] = React.useState(false);
  const [count, setCount] = React.useState(5);
  const sound = useSound();

  React.useEffect(() => {
    if (!breathing) return;
    if (count <= 0) {
      setBreathing(false);
      sound("bell");
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [breathing, count, sound]);

  if (breathing) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="overflow-hidden"
      >
        <div className="rounded-2xl bg-gold/[0.04] border border-gold/12 p-4 text-center">
          <div className="text-[10px] uppercase tracking-[0.18em] text-gold/70 font-medium mb-2">
            Sit with {cardName}
          </div>
          <motion.div
            className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
            style={{
              background: "radial-gradient(circle, rgba(197,168,124,0.15), transparent 70%)",
              border: "1px solid rgba(197,168,124,0.25)",
            }}
            animate={{ scale: [0.9, 1.1, 0.9] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="text-[18px] font-light text-gold tabular-nums">{count}</span>
          </motion.div>
          <p className="text-[11px] text-ink-muted mt-2">Breathe slowly. Let the card settle.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <button
      onClick={() => { setBreathing(true); setCount(5); sound("tap"); }}
      className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-gold/50 hover:text-gold/80 transition-colors"
    >
      <span>✦</span>
      Sit with {cardName} for a moment
    </button>
  );
}

/** Smart frequency suggestion — recommends a frequency based on the drawn card's intention. */
function SmartFrequencySuggestion({
  card,
  reversed,
  onNavigate,
}: {
  card: any;
  reversed: boolean;
  onNavigate: () => void;
}) {
  if (!card) return null;

  // Detect the best matching frequency from the card's name + keywords
  const keywords = reversed ? card.keywordsReversed : card.keywordsUpright;
  const preset = detectIntention(`${card.name} ${keywords.join(" ")}`);

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      onClick={onNavigate}
      className="w-full text-left group mt-2"
    >
      <div
        className="relative rounded-2xl overflow-hidden p-3.5 border transition-all"
        style={{
          borderColor: `${preset.color}33`,
          background: `linear-gradient(135deg, ${preset.color}0a 0%, transparent 70%)`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: `${preset.color}15`,
              border: `1px solid ${preset.color}40`,
            }}
          >
            <AudioLines className="w-4 h-4" style={{ color: preset.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: `${preset.color}99` }}>
              Step 4 · Balance
            </div>
            <div className="text-[13px] font-medium text-ink mt-0.5">
              Resonate with {preset.glyph} Hz
            </div>
            <div className="text-[10px] text-ink-muted mt-0.5">{preset.label}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-ink-muted">Tune & breathe</div>
            <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-gold transition-colors ml-auto mt-1" />
          </div>
        </div>
      </div>
    </motion.button>
  );
}
