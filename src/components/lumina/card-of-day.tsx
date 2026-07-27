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

  const { data, isLoading } = useQuery<CotDData>({
    queryKey: ["card-of-day"],
    queryFn: async () => (await api("/api/tarot/card-of-day")).json(),
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
      <ShellCard className="p-4">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-[60px] h-[90px] rounded-[10px] bg-white/5" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-20 bg-white/5 rounded" />
            <div className="h-4 w-32 bg-white/5 rounded" />
            <div className="h-3 w-40 bg-white/5 rounded" />
          </div>
        </div>
      </ShellCard>
    );
  }

  const { card, reversed, reflection } = data;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-gold/80 font-medium">
            Card of the Day
          </div>
          <div className="text-[10px] text-ink-muted mt-0.5">
            {new Date(data.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </div>
        </div>
        <Pill variant="gold">
          <Sparkles className="w-3 h-3" />
          {reversed ? "Reversed" : "Upright"}
        </Pill>
      </div>

      <ShellCard className="overflow-hidden">
        <div className="p-4">
          <div className="flex gap-4">
            <button
              onClick={() => setDetailOpen(true)}
              className="relative group shrink-0"
              aria-label={`View details for ${card.name}`}
            >
              <TarotCardFace card={card} reversed={reversed} size="sm" />
              <div className="absolute inset-0 rounded-[14px] bg-gold/0 group-hover:bg-gold/10 transition-colors" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base leading-none">{card.symbol}</span>
                <h3 className="text-[15px] font-medium text-ink leading-[18px]">{card.name}</h3>
              </div>
              <p className="text-[12px] leading-[17px] text-ink-muted line-clamp-3">
                {reversed ? card.meaningReversed : card.meaningUpright}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {(reversed ? card.keywordsReversed : card.keywordsUpright).slice(0, 3).map((k) => (
                  <Pill key={k} variant="gold">{k}</Pill>
                ))}
              </div>
            </div>
          </div>

          <Divider className="my-3" />

          {/* Affirmation */}
          <div className="rounded-lg bg-gold/[0.06] border border-gold/12 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-gold/70 font-medium mb-0.5">Today's affirmation</div>
            <p className="text-[12px] leading-[17px] text-ink italic">"{card.affirmation}"</p>
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
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-[13px] leading-[18px] text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-gold/40 resize-none"
                  />
                  <div className="flex gap-2">
                    <GoldButton
                      onClick={() => saveMutation.mutate(note)}
                      disabled={saveMutation.isPending || !note.trim()}
                      className="flex-1 py-2 text-[12px]"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {saveMutation.isPending ? "Saving…" : "Save reflection"}
                    </GoldButton>
                    <GhostButton onClick={() => { setEditing(false); setNote(""); }} className="py-2 px-3 text-[12px]">
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
                  className="rounded-lg bg-white/[0.03] border border-white/8 px-3 py-2"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-ink-muted font-medium">Your reflection</div>
                    <button
                      onClick={() => { setNote(reflection); setEditing(true); }}
                      className="text-[10px] text-gold/70 hover:text-gold flex items-center gap-1"
                    >
                      <PenLine className="w-3 h-3" /> Edit
                    </button>
                  </div>
                  <p className="text-[12px] leading-[17px] text-ink italic">"{reflection}"</p>
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
                    className="w-full py-2 text-[12px]"
                  >
                    <PenLine className="w-3.5 h-3.5" />
                    Add a reflection
                  </GhostButton>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => setTab("tarot")}
              className="flex-1 flex items-center justify-center gap-1.5 text-[11px] text-gold/70 hover:text-gold transition-colors py-1"
            >
              <RefreshCw className="w-3 h-3" />
              Ask the cards
            </button>
            <button
              onClick={() => setJournalOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 text-[11px] text-ink-muted hover:text-ink transition-colors py-1"
            >
              <BookOpen className="w-3 h-3" />
              Journal
            </button>
          </div>
        </div>
      </ShellCard>

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
