"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, RotateCw, Sun, Moon, Hash, Star, Zap } from "lucide-react";
import type { TarotCard } from "@/lib/tarot-data";
import { TarotCardFace } from "@/features/tarot/tarot-card-face";
import { Pill, Divider } from "@/components/lumina/primitives";

interface CardDetailModalProps {
  card: TarotCard | null;
  reversed?: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function CardDetailModal({ card, reversed = false, open, onOpenChange }: CardDetailModalProps) {
  return (
    <AnimatePresence>
      {open && card && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
          onClick={() => onOpenChange(false)}
        >
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-md m-3 lum-glass-float rounded-t-[28px] sm:rounded-[28px] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold" />
                <h3 className="text-[15px] font-medium text-ink">{card.name}</h3>
                {reversed && <Pill variant="gold"><RotateCw className="w-3 h-3" />Reversed</Pill>}
              </div>
              <button onClick={() => onOpenChange(false)} className="text-ink-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4 lum-no-scrollbar">
              {/* Card visual + meta */}
              <div className="flex gap-4">
                <TarotCardFace card={card} reversed={reversed} size="md" />
                <div className="flex-1 min-w-0 space-y-2 pt-1">
                  <MetaRow icon={Hash} label="Number" value={card.arcana === "major" ? roman(card.number) : String(card.number)} />
                  <MetaRow icon={Star} label="Arcana" value={card.arcana === "major" ? "Major" : `Minor · ${cap(card.suit)}`} />
                  {card.element && <MetaRow icon={Zap} label="Element" value={card.element} />}
                  {card.astrology && <MetaRow icon={card.astrology.toLowerCase().includes("moon") ? Moon : Sun} label="Astrology" value={card.astrology} />}
                </div>
              </div>

              <Divider />

              {/* Meaning */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${reversed ? "bg-destructive/15 border border-destructive/30" : "bg-leaf/15 border border-leaf/30"}`}>
                    {reversed ? <Moon className="w-3 h-3 text-destructive" /> : <Sun className="w-3 h-3 text-leaf" />}
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.18em] font-medium text-ink-muted">
                    {reversed ? "Reversed Meaning" : "Upright Meaning"}
                  </span>
                </div>
                <p className="text-[14px] leading-[22px] text-ink">
                  {reversed ? card.meaningReversed : card.meaningUpright}
                </p>
              </div>

              {/* Keywords */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] font-medium text-ink-muted mb-2">
                  {reversed ? "Reversed Keywords" : "Upright Keywords"}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(reversed ? card.keywordsReversed : card.keywordsUpright).map((k) => (
                    <Pill key={k} variant={reversed ? "default" : "gold"}>{k}</Pill>
                  ))}
                </div>
              </div>

              <Divider />

              {/* Yes/No */}
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/8 p-3">
                <span className="text-[12px] text-ink-muted">Yes/No tendency</span>
                <div className="flex items-center gap-2">
                  <Pill variant={card.yesNoUpright === "yes" ? "leaf" : card.yesNoUpright === "no" ? "default" : "default"}>
                    Upright: {cap(card.yesNoUpright)}
                  </Pill>
                  <Pill variant={card.yesNoReversed === "yes" ? "leaf" : "default"}>
                    Rev: {cap(card.yesNoReversed)}
                  </Pill>
                </div>
              </div>

              {/* Affirmation */}
              <div className="rounded-xl bg-gold/[0.06] border border-gold/15 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-gold" />
                  <span className="text-[11px] uppercase tracking-[0.18em] font-medium text-gold/80">Affirmation</span>
                </div>
                <p className="text-[14px] leading-[20px] text-ink italic">"{card.affirmation}"</p>
              </div>

              {card.numerology && (
                <div className="rounded-xl bg-white/[0.03] border border-white/8 p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] font-medium text-ink-muted mb-1">Numerology</div>
                  <p className="text-[12px] leading-[17px] text-ink-muted">{card.numerology}</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MetaRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3 h-3 text-gold/70 shrink-0" />
      <span className="text-[11px] text-ink-muted w-16 shrink-0">{label}</span>
      <span className="text-[12px] text-ink font-medium">{value}</span>
    </div>
  );
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function roman(n: number): string {
  const map: [number, string][] = [
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let res = ""; let x = n;
  for (const [v, s] of map) while (x >= v) { res += s; x -= v; }
  return res || "0";
}
