"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, PenLine, Check, RefreshCw, BookOpen, X } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { GlassCard, ShellCard, GoldButton, GhostButton, Pill, Divider } from "@/components/lumina/primitives";
import { TarotCardFace } from "@/features/tarot/tarot-card-face";
import { CardDetailModal } from "@/features/tarot/card-detail-modal";
import { useAppStore } from "@/lib/store";
import type { TarotCard } from "@/lib/tarot-data";

type CotDData = {
  date: string;
  card: TarotCard;
  reversed: boolean;
  reflection: string | null;
  reflectionId: string | null;
};

export function CardOfDay() {
  const api = useApi();
  const { toast } = useToast();
  const qc = useQueryClient();
  const setTab = useAppStore((s) => s.setTab);
  const [editing, setEditing] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [journalOpen, setJournalOpen] = React.useState(false);
  const [cardRevealed, setCardRevealed] = React.useState(false);

  const { data, isLoading } = useQuery<CotDData>({
    queryKey: ["card-of-day"],
    queryFn: async () => (await api("/api/tarot/card-of-day")).json(),
    staleTime: 60000, // #18: cache for 1 min — card doesn't change during the day
  });

  const saveMutation = useMutation({
    mutationFn: async (reflection: string) =>
      (await api("/api/tarot/card-of-day", {
        method: "POST",
        body: JSON.stringify({ reflection }),
      })).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["card-of-day"] });
      setEditing(false);
      toast({ title: "Reflection saved", description: "Your note for today is recorded." });
    },
  });

  if (isLoading || !data) {
    return (
      <div className="lum-glass rounded-2xl p-6 flex flex-col items-center animate-pulse">
        <div className="w-[120px] h-[180px] rounded-[14px] bg-white/5 mb-4" />
        <div className="h-4 w-32 bg-white/5 rounded mb-2" />
        <div className="h-3 w-48 bg-white/5 rounded" />
      </div>
    );
  }

  const { card, reversed, reflection } = data;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[12px] uppercase tracking-[0.2em] text-gold font-medium">
            Card of the Day
          </div>
          <div className="text-[12px] text-ink-muted mt-0.5">
            {new Date(data.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </div>
        </div>
        <Pill variant="gold">
          <Sparkles className="w-3 h-3" />
          {reversed ? "Reversed" : "Upright"}
        </Pill>
      </div>

      {/* Premium gradient-border card */}
      <div
        className="relative rounded-3xl overflow-hidden p-[1.5px]"
        style={{
          background: `linear-gradient(135deg, rgba(197,168,124,0.4) 0%, rgba(197,168,124,0.08) 40%, rgba(255,255,255,0.03) 70%, rgba(197,168,124,0.2) 100%)`,
        }}
      >
        <div
          className="w-full rounded-[22px] relative overflow-hidden"
          style={{ background: "linear-gradient(165deg, #0f0d0a 0%, #050403 100%)" }}
        >
          {/* Ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(80% 50% at 50% 0%, rgba(197,168,124,0.10) 0%, transparent 70%)" }}
          />

          <div className="relative z-10 p-5">
            {/* Large centered card with reveal animation */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => {
                  if (!cardRevealed) {
                    setCardRevealed(true);
                  } else {
                    setDetailOpen(true);
                  }
                }}
                className="relative group"
                aria-label={`View details for ${card.name}`}
                style={{ filter: cardRevealed ? "drop-shadow(0 0 20px rgba(197,168,124,0.25))" : "none" }}
              >
                <motion.div
                  animate={{
                    filter: cardRevealed ? "blur(0px)" : "blur(14px)",
                    opacity: cardRevealed ? 1 : 0.5,
                  }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                >
                  <TarotCardFace card={card} reversed={reversed} size="md" />
                </motion.div>
                {!cardRevealed && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                      className="text-[32px]"
                      style={{ filter: "drop-shadow(0 0 12px rgba(197,168,124,0.5))" }}
                    >
                      ✦
                    </motion.div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-gold font-medium mt-2">Tap to reveal</div>
                  </div>
                )}
                {cardRevealed && (
                  <div className="absolute inset-0 rounded-[16px] bg-gold/0 group-hover:bg-gold/10 transition-colors" />
                )}
              </button>
            </div>

            {/* Card name + meaning — hidden until revealed */}
            <AnimatePresence>
              {cardRevealed ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="mt-5 text-center"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-xl leading-none">{card.symbol}</span>
                    <h3 className="text-[18px] font-medium text-ink leading-[22px]">{card.name}</h3>
                    {reversed && (
                      <span className="text-[11px] uppercase tracking-[0.12em] text-gold/70 font-medium">· Rev</span>
                    )}
                  </div>
                  <p className="text-[13px] leading-[20px] text-ink-muted max-w-[300px] mx-auto">
                    {reversed ? card.meaningReversed : card.meaningUpright}
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                    {(reversed ? card.keywordsReversed : card.keywordsUpright).slice(0, 3).map((k) => (
                      <Pill key={k} variant="gold">{k}</Pill>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-5 text-center"
                >
                  {/* Mysterious placeholder — no spoilers */}
                  <div className="h-5 w-40 bg-white/[0.06] rounded-full mx-auto mb-3" style={{ filter: "blur(8px)" }} />
                  <div className="space-y-2 max-w-[260px] mx-auto">
                    <div className="h-3 bg-white/[0.04] rounded-full" style={{ filter: "blur(6px)" }} />
                    <div className="h-3 w-3/4 bg-white/[0.04] rounded-full mx-auto" style={{ filter: "blur(6px)" }} />
                  </div>
                  <p className="text-[12px] text-ink-muted/60 italic mt-4">Reveal to discover today's message</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Affirmation + Reflection — hidden until revealed */}
            <AnimatePresence>
              {cardRevealed && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <Divider className="my-4" />

                  {/* Affirmation */}
                  <div
                    className="rounded-xl px-4 py-3"
                    style={{ background: "rgba(197,168,124,0.06)", border: "1px solid rgba(197,168,124,0.15)" }}
                  >
                    <div className="text-[11px] uppercase tracking-[0.18em] text-gold font-medium mb-1">Today's affirmation</div>
                    <p className="text-[14px] leading-[20px] text-ink italic">"{card.affirmation}"</p>
                  </div>

            {/* Reflection */}
            <div className="mt-3">
              <AnimatePresence mode="wait">
                {editing ? (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="How does this card speak to your day?"
                      rows={3}
                      autoFocus
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-[14px] leading-[20px] text-ink placeholder:text-ink-muted/70 focus:outline-none focus:border-gold/40 resize-none"
                    />
                    <div className="flex gap-2">
                      <GoldButton
                        onClick={() => saveMutation.mutate(note)}
                        disabled={saveMutation.isPending || !note.trim()}
                        className="flex-1 py-2.5 text-[13px]"
                      >
                        <Check className="w-4 h-4" />
                        {saveMutation.isPending ? "Saving…" : "Save reflection"}
                      </GoldButton>
                      <GhostButton onClick={() => { setEditing(false); setNote(""); }} className="py-2.5 px-4 text-[13px]">
                        Cancel
                      </GhostButton>
                    </div>
                  </motion.div>
                ) : reflection ? (
                  <motion.div
                    key="show"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl bg-white/[0.03] border border-white/8 px-4 py-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-ink-muted font-medium">Your reflection</div>
                      <button
                        onClick={() => { setNote(reflection); setEditing(true); }}
                        className="text-[12px] text-gold/80 hover:text-gold flex items-center gap-1"
                      >
                        <PenLine className="w-3.5 h-3.5" /> Edit
                      </button>
                    </div>
                    <p className="text-[14px] leading-[20px] text-ink italic">"{reflection}"</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <GhostButton
                      onClick={() => { setNote(""); setEditing(true); }}
                      className="w-full py-2.5 text-[13px]"
                    >
                      <PenLine className="w-4 h-4" />
                      Add a reflection
                    </GhostButton>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => setTab("tarot")}
                className="flex-1 flex items-center justify-center gap-1.5 text-[12px] text-gold/80 hover:text-gold transition-colors py-2 rounded-full border border-gold/20 hover:border-gold/40"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Ask the cards
              </button>
              <button
                onClick={() => setJournalOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 text-[12px] text-ink-muted hover:text-ink transition-colors py-2 rounded-full border border-white/10 hover:border-white/20"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Journal
              </button>
            </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <CardDetailModal card={card} reversed={reversed} open={detailOpen} onOpenChange={setDetailOpen} />
      <JournalSheet open={journalOpen} onOpenChange={setJournalOpen} />
    </div>
  );
}

type Reflection = {
  id: string;
  date: string;
  card: TarotCard;
  reversed: boolean;
  reflection: string;
  affirmation: string;
};

function JournalSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const api = useApi();
  const { data, isLoading } = useQuery<{ reflections: Reflection[] }>({
    queryKey: ["reflections"],
    queryFn: async () => (await api("/api/tarot/reflections")).json(),
    enabled: open,
  });
  const reflections = data?.reflections ?? [];

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
            className="relative w-full max-w-md m-3 lum-glass-float rounded-t-[28px] sm:rounded-[28px] max-h-[82vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gold" />
                <h3 className="text-[15px] font-medium text-ink">Reflection Journal</h3>
              </div>
              <button onClick={() => onOpenChange(false)} className="text-ink-muted hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 lum-no-scrollbar">
              {isLoading ? (
                <div className="text-center py-8 text-ink-muted text-[13px]">Loading…</div>
              ) : reflections.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="w-5 h-5 text-gold/60" />
                  </div>
                  <div className="text-[14px] font-medium text-ink">No reflections yet</div>
                  <p className="text-[12px] text-ink-muted mt-1 max-w-[240px] mx-auto leading-[16px]">
                    Write your first reflection on today's Card of the Day, and it will appear here.
                  </p>
                </div>
              ) : (
                reflections.map((r) => (
                  <div key={r.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                    <div className="flex items-start gap-3">
                      <div className="text-lg leading-none mt-0.5 shrink-0">{r.card.symbol}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] font-medium text-ink">
                            {r.card.nameShort}
                            {r.reversed && <span className="text-ink-muted"> · Rev</span>}
                          </span>
                          <span className="text-[10px] text-ink-muted shrink-0">
                            {new Date(r.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <p className="text-[12px] text-ink-muted mt-1 leading-[17px] italic">"{r.reflection}"</p>
                        <div className="mt-2 text-[10px] text-gold/70">
                          ✦ {r.affirmation}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
