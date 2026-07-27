"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, Check, Sparkles, Infinity as InfinityIcon, AudioLines, Target } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { GoldButton, GhostButton } from "@/components/lumina/primitives";
import { useAppStore } from "@/lib/store";

const PERKS = [
  { icon: Sparkles, title: "Unlimited Tarot", desc: "All spreads · Celtic Cross · deep AI readings" },
  { icon: Target, title: "Unlimited Manifestation", desc: "Endless goals · daily ritual tracking" },
  { icon: AudioLines, title: "Unlimited Frequencies", desc: "Binaural · ambient pads · custom tones" },
  { icon: Crown, title: "Premium identity", desc: "Gold mark · priority everything" },
];

export function PremiumModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const api = useApi();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const pending = useAppStore((s) => s.pendingPremiumAction);
  const setPending = useAppStore((s) => s.setPendingPremiumAction);

  React.useEffect(() => {
    if (!open) setPending(null);
  }, [open, setPending]);

  async function activate() {
    setLoading(true);
    try {
      const res = await api("/api/me", {
        method: "PATCH",
        body: JSON.stringify({ isPremium: true }),
      });
      if (res.ok) {
        toast({ title: "Welcome to Lumina Premium", description: "Everything is unlocked." });
        onOpenChange(false);
        setTimeout(() => window.location.reload(), 600);
      } else {
        toast({ title: "Could not activate", description: "Please try again." });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
          onClick={() => onOpenChange(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-md m-3 lum-glass-float rounded-[28px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative px-6 pt-7 pb-5 lum-glow-gold">
              <button
                onClick={() => onOpenChange(false)}
                className="absolute top-4 right-4 text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#E7D2A8] to-[#9c7f54] flex items-center justify-center shadow-[0_0_30px_rgba(197,168,124,0.5)]">
                    <Crown className="w-7 h-7 text-black" />
                  </div>
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{ animation: "lum-pulse-ring 2.4s ease-out infinite", boxShadow: "0 0 0 2px rgba(197,168,124,0.4)" }}
                  />
                </div>
                <h2 className="mt-4 text-[22px] font-light tracking-[-0.02em] text-ink">
                  Lumina <span className="lum-text-gold">Premium</span>
                </h2>
                <p className="mt-1 text-[13px] text-ink-muted leading-[18px]">
                  The full ritual. Unlimited readings, manifestations, and frequencies.
                </p>
                {pending && (
                  <div className="mt-3 rounded-lg bg-gold/[0.08] border border-gold/20 px-3 py-2 text-[12px] text-gold/90">
                    {pending}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-5 space-y-3">
              {PERKS.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.title} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-ink flex items-center gap-1.5">
                        {p.title}
                        <InfinityIcon className="w-3 h-3 text-leaf" />
                      </div>
                      <div className="text-[12px] text-ink-muted leading-[16px]">{p.desc}</div>
                    </div>
                    <Check className="w-4 h-4 text-leaf shrink-0 mt-1" />
                  </div>
                );
              })}
            </div>

            <div className="px-6 pb-6 space-y-3">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-[28px] font-light text-ink">$9</span>
                <span className="text-[14px] text-ink-muted">/month</span>
                <span className="ml-2 text-[11px] text-ink-muted line-through">$19</span>
              </div>
              <GoldButton onClick={activate} disabled={loading} className="w-full">
                <Crown className="w-4 h-4" />
                {loading ? "Activating…" : "Activate Premium"}
              </GoldButton>
              <GhostButton onClick={() => onOpenChange(false)} className="w-full">
                Maybe later
              </GhostButton>
              <p className="text-center text-[10px] text-ink-muted/70 leading-[14px]">
                Demo mode · no payment required. Premium is applied to this device.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
