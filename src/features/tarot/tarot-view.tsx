"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Shuffle, History, Lock, ChevronRight, X, RefreshCw, Loader2 } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { SPREADS, type SpreadType } from "@/lib/limits";
import { TarotCardFace, TarotCardBack } from "./tarot-card-face";
import { CardDetailModal } from "./card-detail-modal";
import {
  GlassCard,
  ShellCard,
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
};

export function TarotView({ isPremium, remaining }: { isPremium: boolean; remaining: number | null }) {
  const api = useApi();
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

  async function performReading() {
    if (!question.trim()) {
      toast({ title: "Ask a question first", description: "The cards respond to your intention." });
      return;
    }
    setPhase("shuffling");
    setReading(null);
    setRevealedIdx(0);

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
      // Reveal cards one by one
      const total = data.reading.cards.length;
      for (let i = 0; i < total; i++) {
        await new Promise((r) => setTimeout(r, 650));
        setRevealedIdx(i + 1);
      }
      await new Promise((r) => setTimeout(r, 400));
      setPhase("result");
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
            <ShellCard className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] uppercase tracking-[0.18em] text-ink-muted font-medium">
                    Your question
                  </label>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="What does your heart need to know?"
                    rows={2}
                    className="mt-2 w-full bg-transparent resize-none text-[15px] leading-[22px] text-ink placeholder:text-ink-muted/60 focus:outline-none"
                  />
                </div>
                <Divider />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] uppercase tracking-[0.18em] text-ink-muted font-medium">
                      Spread
                    </label>
                    <Pill variant="gold">
                      {remaining === null ? "Premium" : `${remaining} left`}
                    </Pill>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SPREADS.map((s) => {
                      const locked = !isPremium && s.premium;
                      const selected = spread === s.id;
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
                          className={`relative text-left rounded-xl p-3 border transition-all ${
                            selected
                              ? "border-gold/50 bg-gold/10"
                              : "border-white/8 bg-white/[0.02] hover:border-white/15"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-medium text-ink">{s.name}</span>
                            {locked && <Lock className="w-3 h-3 text-ink-muted" />}
                          </div>
                          <div className="text-[11px] text-ink-muted mt-0.5 leading-[14px]">
                            {s.cardCount} card{s.cardCount > 1 ? "s" : ""} · {s.premium ? "Premium" : "Free"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-ink-muted mt-2 leading-[15px]">
                    {currentSpread.description}
                  </p>
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
            </ShellCard>

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
            className="space-y-4"
          >
            <GlassCard className="p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-gold/80 font-medium mb-1">
                Your question
              </div>
              <p className="text-[15px] leading-[21px] text-ink italic">"{reading.question}"</p>
            </GlassCard>

            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-wrap items-end justify-center gap-3">
                {reading.cards.map((c, i) => {
                  const revealed = i < revealedIdx || phase === "result";
                  return (
                    <div key={i} className="flex flex-col items-center gap-1.5">
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
                            <TarotCardFace card={c.card} reversed={c.reversed} size="md" />
                            <div className="absolute inset-0 rounded-[14px] bg-gold/0 group-hover:bg-gold/10 transition-colors flex items-end justify-center pb-1.5 opacity-0 group-hover:opacity-100">
                              <span className="text-[8px] uppercase tracking-[0.14em] text-gold font-medium">Tap for meaning</span>
                            </div>
                          </motion.button>
                        ) : (
                          <motion.div key="back" exit={{ opacity: 0 }}>
                            <TarotCardBack size="md" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {c.position && (
                        <div className="text-[10px] uppercase tracking-[0.14em] text-ink-muted text-center max-w-[120px]">
                          {c.position}
                        </div>
                      )}
                      {revealed && (
                        <div className="text-[11px] text-ink text-center max-w-[130px] leading-[13px]">
                          {c.card.nameShort}
                          {c.reversed && <span className="text-ink-muted"> · Rev</span>}
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
                  <ShellCard className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-gold" />
                      <span className="text-[11px] uppercase tracking-[0.18em] text-gold/80 font-medium">
                        The Reading
                      </span>
                    </div>
                    <div className="text-[14px] leading-[22px] text-ink whitespace-pre-wrap">
                      <FormattedText text={reading.interpretation} />
                    </div>

                    {/* Keywords + affirmation */}
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
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(c.reversed ? c.card.keywordsReversed : c.card.keywordsUpright)
                                .slice(0, 4)
                                .map((k: string) => (
                                  <Pill key={k}>{k}</Pill>
                                ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Divider className="my-4" />
                    <div className="rounded-xl bg-gold/[0.06] border border-gold/15 p-3">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-gold/80 font-medium mb-1">
                        Affirmation
                      </div>
                      <p className="text-[13px] leading-[18px] text-ink italic">
                        "{reading.cards[0].card.affirmation}"
                      </p>
                    </div>
                  </ShellCard>

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
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <HistorySheet open={showHistory} onOpenChange={setShowHistory} />
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

function HistorySheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const api = useApi();
  const [items, setItems] = React.useState<Reading[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setLoading(true);
      api("/api/tarot/history?limit=20")
        .then((r) => r.json())
        .then((d) => setItems(d.readings || []))
        .finally(() => setLoading(false));
    }
  }, [open, api]);

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
            <div className="overflow-y-auto p-4 space-y-3 lum-no-scrollbar">
              {loading ? (
                <div className="text-center py-8 text-ink-muted text-[13px]">Loading…</div>
              ) : items.length === 0 ? (
                <div className="text-center py-8 text-ink-muted text-[13px]">
                  No readings yet. Your first awaits.
                </div>
              ) : (
                items.map((r) => (
                  <button
                    key={r.id}
                    className="w-full text-left rounded-xl border border-white/8 bg-white/[0.02] p-3 hover:border-gold/30 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {r.cards.slice(0, 5).map((c, i) => (
                        <span key={i} className="text-base leading-none">
                          {c.card?.symbol}
                        </span>
                      ))}
                      <span className="ml-auto text-[10px] text-ink-muted">
                        {new Date(r.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="text-[13px] text-ink line-clamp-1 mb-1">"{r.question}"</div>
                    <div className="text-[11px] text-ink-muted line-clamp-2 leading-[15px]">
                      {r.interpretation.replace(/\*\*/g, "")}
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gold">
                      <span className="uppercase tracking-[0.1em]">{r.spreadType.replace("-", " ")}</span>
                      <ChevronRight className="w-3 h-3" />
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
