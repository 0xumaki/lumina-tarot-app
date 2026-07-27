"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Crown, Sparkles, Target, AudioLines, Check, X, Infinity as InfinityIcon, ShieldCheck, Star,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import {
  GlassCard, ShellCard, GoldButton, GhostButton, Pill, SectionTitle, Divider, StarField,
} from "@/components/lumina/primitives";
import { useAppStore } from "@/lib/store";

const COMPARISON: {
  feature: string;
  free: string | boolean;
  premium: string | boolean;
}[] = [
  { feature: "Tarot questions / day", free: "2", premium: true },
  { feature: "Available spreads", free: "Yes/No + Single", premium: "All 6 incl. Celtic Cross" },
  { feature: "AI reading depth", free: "Short", premium: "Deep & multi-paragraph" },
  { feature: "Reading history", free: true, premium: true },
  { feature: "Manifestation goals", free: "1 active", premium: true },
  { feature: "Daily confirmation ritual", free: true, premium: true },
  { feature: "Frequency session length", free: "30 seconds", premium: "Unlimited" },
  { feature: "Audio modes", free: "Pure + Binaural", premium: "+ Ambient pads" },
  { feature: "Home-screen widget & reminders", free: true, premium: true },
  { feature: "Priority AI responses", free: false, premium: true },
];

export function PremiumView() {
  const api = useApi();
  const { toast } = useToast();
  const setTab = useAppStore((s) => s.setTab);

  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api("/api/me")).json(),
  });
  const isPremium = data?.device?.isPremium;
  const [loading, setLoading] = React.useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await api("/api/me", {
        method: "PATCH",
        body: JSON.stringify({ isPremium: !isPremium }),
      });
      if (res.ok) {
        toast({
          title: isPremium ? "Premium paused" : "Welcome to Premium",
          description: isPremium ? "You're back on the free tier." : "Everything is unlocked.",
        });
        setTimeout(() => window.location.reload(), 600);
      }
    } finally {
      setLoading(false);
    }
  }

  if (isPremium) {
    return (
      <div className="space-y-5">
        <ShellCard className="overflow-hidden">
          <div className="relative p-6 lum-glow-gold">
            <StarField count={18} />
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E7D2A8] to-[#9c7f54] flex items-center justify-center shadow-[0_0_40px_rgba(197,168,124,0.6)]">
                <Crown className="w-8 h-8 text-black" />
              </div>
              <div className="mt-3 text-[11px] uppercase tracking-[0.22em] text-gold/80 font-medium">
                Lumina Premium · Active
              </div>
              <h2 className="mt-1 text-[22px] font-light tracking-[-0.02em] text-ink">
                The full ritual is yours
              </h2>
              <p className="mt-1 text-[13px] text-ink-muted max-w-[280px] leading-[18px]">
                Unlimited tarot, manifestations, and frequencies. Thank you for being here.
              </p>
              <GhostButton onClick={toggle} disabled={loading} className="mt-4">
                {loading ? "…" : "Manage subscription"}
              </GhostButton>
            </div>
          </div>
        </ShellCard>

        <PremiumPerksGrid />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Lumina Premium"
        title={<>One ritual. <span className="lum-text-gold">Everything</span> unlocked.</>}
        subtitle="Unlimited readings, goals, and frequencies — for less than a coffee a month."
      />

      <ShellCard className="overflow-hidden">
        <div className="relative p-6 lum-glow-gold">
          <StarField count={16} />
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E7D2A8] to-[#9c7f54] flex items-center justify-center shadow-[0_0_40px_rgba(197,168,124,0.5)]">
              <Crown className="w-8 h-8 text-black" />
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-[36px] font-light text-ink">$9</span>
              <span className="text-[14px] text-ink-muted">/month</span>
              <span className="ml-2 text-[12px] text-ink-muted line-through">$19</span>
            </div>
            <p className="mt-1 text-[12px] text-ink-muted">Cancel anytime · demo mode, no payment</p>
            <GoldButton onClick={toggle} disabled={loading} className="mt-4 w-full max-w-[260px]">
              <Crown className="w-4 h-4" />
              {loading ? "Activating…" : "Activate Premium"}
            </GoldButton>
          </div>
        </div>
      </ShellCard>

      <PremiumPerksGrid />

      {/* Comparison */}
      <GlassCard className="p-4">
        <h3 className="text-[13px] font-medium text-ink uppercase tracking-[0.14em] mb-3">
          Free vs Premium
        </h3>
        <div className="space-y-0">
          {COMPARISON.map((row, i) => (
            <div key={i}>
              {i > 0 && <Divider />}
              <div className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0 text-[12px] text-ink-muted">{row.feature}</div>
                <div className="w-16 text-right text-[12px] flex items-center justify-end gap-1">
                  {row.free === true ? (
                    <Check className="w-3.5 h-3.5 text-leaf" />
                  ) : row.free === false ? (
                    <X className="w-3.5 h-3.5 text-ink-muted/50" />
                  ) : (
                    <span className="text-ink-muted">{row.free}</span>
                  )}
                </div>
                <div className="w-20 text-right text-[12px] flex items-center justify-end gap-1">
                  {row.premium === true ? (
                    <InfinityIcon className="w-4 h-4 text-gold" />
                  ) : (
                    <span className="text-gold">{row.premium}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 pt-2 text-[10px] uppercase tracking-[0.16em]">
          <span className="text-ink-muted">Free</span>
          <span className="text-gold">Premium</span>
        </div>
      </GlassCard>

      <GlassCard className="p-3.5">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-3.5 h-3.5 text-leaf mt-0.5 shrink-0" />
          <p className="text-[11px] leading-[15px] text-ink-muted">
            Demo build — no payment is processed. Premium is stored on this device only.
            In production this would connect to a real billing provider.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}

function PremiumPerksGrid() {
  const perks = [
    { icon: Sparkles, title: "Unlimited Tarot", desc: "All spreads, including the Celtic Cross. Deep, multi-paragraph AI readings.", color: "#C5A87C" },
    { icon: Target, title: "Unlimited Manifestation", desc: "As many goals as your heart holds, each with its own ritual and streak.", color: "#B5CD7E" },
    { icon: AudioLines, title: "Unlimited Frequencies", desc: "Binaural beats, ambient pads, custom tones — no 30-second ceiling.", color: "#9E8AC9" },
    { icon: Star, title: "Priority & ad-free", desc: "Faster AI responses and a calm, uninterrupted ritual space.", color: "#E0A86B" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {perks.map((p, i) => {
        const Icon = p.icon;
        return (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
          >
            <GlassCard className="p-3.5 h-full">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center mb-2"
                style={{ background: `${p.color}1a`, border: `1px solid ${p.color}40` }}
              >
                <Icon className="w-4 h-4" style={{ color: p.color }} />
              </div>
              <div className="text-[13px] font-medium text-ink">{p.title}</div>
              <div className="text-[11px] text-ink-muted mt-0.5 leading-[15px]">{p.desc}</div>
            </GlassCard>
          </motion.div>
        );
      })}
    </div>
  );
}
