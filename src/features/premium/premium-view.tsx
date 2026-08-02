"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, Sparkles, Target, AudioLines, Check, X, Infinity as InfinityIcon, ShieldCheck, Star, RotateCcw,
  ChevronDown, Calendar, Moon, Sun, Heart, BookOpen,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import {
  GlassCard, ShellCard, GoldButton, GhostButton, Pill, SectionTitle, Divider, StarField,
} from "@/components/lumina/primitives";
import { useAppStore } from "@/lib/store";

/* ============================================================
   COMPREHENSIVE COMPARISON — grouped by pillar
   ============================================================ */

type Cell = string | boolean;
type Row = { feature: string; free: Cell; premium: Cell };

const GROUPS: { label: string; icon: typeof Sparkles; color: string; rows: Row[] }[] = [
  {
    label: "Tarot & Divination",
    icon: Sparkles,
    color: "#C5A87C",
    rows: [
      { feature: "Tarot questions per day", free: "2", premium: true },
      { feature: "Available spreads", free: "Yes/No + Single", premium: "All 6 incl. Celtic Cross" },
      { feature: "AI reading depth", free: "Short answer", premium: "Deep, multi-paragraph" },
      { feature: "TL;DR + Summary synthesis", free: "Basic", premium: "Full context answer" },
      { feature: "Reading history", free: true, premium: true },
      { feature: "Card-of-Day reveal", free: true, premium: true },
      { feature: "Priority AI responses", free: false, premium: true },
    ],
  },
  {
    label: "Manifestation",
    icon: Target,
    color: "#B5CD7E",
    rows: [
      { feature: "Active goals", free: "1", premium: true },
      { feature: "Daily confirmation ritual", free: true, premium: true },
      { feature: "Streak tracking", free: true, premium: true },
      { feature: "Auto-intention → frequency match", free: true, premium: true },
      { feature: "Positivity Generator sessions", free: "1 / day", premium: true },
      { feature: "Positivity categories", free: "3", premium: "All 11" },
      { feature: "Session length (positivity)", free: "1 min", premium: "Up to 5 min" },
    ],
  },
  {
    label: "Frequencies & Tones",
    icon: AudioLines,
    color: "#9E8AC9",
    rows: [
      { feature: "Frequency session length", free: "30 seconds", premium: "Unlimited (up to 3 hr)" },
      { feature: "Audio modes", free: "Pure + Binaural", premium: "+ Ambient pads" },
      { feature: "Ambient beds", free: "Rain & Ocean", premium: "All 5 (rain, ocean, wind, stream, river)" },
      { feature: "Breath guide", free: true, premium: true },
      { feature: "Secret Solfeggio frequencies", free: false, premium: "963 · 432 · 528 Hz" },
      { feature: "Custom duration presets", free: false, premium: "30s → 3h slider" },
    ],
  },
];

const FAQ = [
  {
    q: "Is this a real subscription?",
    a: "No — Lumina is currently in demo mode. Activating Premium applies the unlock to this device only, with no payment processed. In production this would connect to a real billing provider.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. You can pause or cancel Premium at any time from your Profile → Manage subscription. Your data stays intact either way.",
  },
  {
    q: "What happens to my free-tier progress?",
    a: "Everything carries over — your readings, goals, streaks, achievements, and the 36 badges you've unlocked. Premium simply lifts the limits on top of what you've already built.",
  },
  {
    q: "Do I need Premium to use Lumina?",
    a: "No. The free ritual — cleanse, manifest, ask the cards, balance — is complete and always will be. Premium removes the ceilings for deeper practice: more readings, longer sessions, all spreads.",
  },
];

export function PremiumView() {
  const api = useApi();
  const { toast } = useToast();

  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api("/api/me")).json(),
  });
  const isPremium = data?.device?.isPremium;
  const [loading, setLoading] = React.useState(false);
  const [billing, setBilling] = React.useState<"monthly" | "annual">("monthly");
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

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

        {/* Even as Premium, show what's unlocked */}
        <FullComparison premium={true} />
      </div>
    );
  }

  const monthlyPrice = 9;
  const annualPrice = 69; // ~$5.75/mo, saves 42%
  const price = billing === "monthly" ? monthlyPrice : annualPrice;
  const priceSub = billing === "monthly" ? "/month" : "/year";
  const perMonth = billing === "annual" ? Math.round(annualPrice / 12) : null;

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Lumina Premium"
        title={<>One ritual. <span className="lum-text-gold">Everything</span> unlocked.</>}
        subtitle="Unlimited readings, goals, and frequencies — for less than a coffee a month."
      />

      {/* Hero card with billing toggle */}
      <ShellCard className="overflow-hidden">
        <div className="relative p-6 lum-glow-gold">
          <StarField count={16} />
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Urgency badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="absolute top-4 right-4 rounded-full bg-gradient-to-r from-[#E89A4A] to-[#C5A87C] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-black shadow-[0_0_16px_rgba(232,154,74,0.5)]"
            >
              50% off
            </motion.div>

            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E7D2A8] to-[#9c7f54] flex items-center justify-center shadow-[0_0_40px_rgba(197,168,124,0.5)]">
                <Crown className="w-8 h-8 text-black" />
              </div>
              <motion.div
                className="absolute inset-0 rounded-full border border-gold/40"
                animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
              />
            </div>

            {/* Social proof */}
            <div className="mt-3 flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-full border border-black/40"
                    style={{
                      background: ["#C5A87C", "#B5CD7E", "#9E8AC9", "#7A8680"][i],
                      opacity: 0.85,
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="w-2.5 h-2.5 text-gold fill-gold" />
                ))}
              </div>
              <span className="text-[10px] text-ink-muted">12,400+ seekers</span>
            </div>

            {/* Billing toggle */}
            <div className="mt-4 inline-flex items-center p-1 rounded-full bg-white/[0.04] border border-white/8">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-4 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                  billing === "monthly" ? "bg-gold/20 text-gold" : "text-ink-muted"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("annual")}
                className={`px-4 py-1.5 rounded-full text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                  billing === "annual" ? "bg-gold/20 text-gold" : "text-ink-muted"
                }`}
              >
                Annual
                <span className="text-[8px] px-1 py-0.5 rounded-full bg-leaf/20 text-leaf">−42%</span>
              </button>
            </div>

            {/* Price */}
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-[36px] font-light text-ink">${price}</span>
              <span className="text-[14px] text-ink-muted">{priceSub}</span>
              {billing === "monthly" ? (
                <span className="ml-2 text-[12px] text-ink-muted line-through">$19</span>
              ) : (
                <span className="ml-2 text-[11px] text-leaf">≈ ${perMonth}/mo</span>
              )}
            </div>
            <p className="mt-1 text-[12px] text-ink-muted">
              {billing === "annual" ? "Billed yearly · " : ""}Cancel anytime · demo mode, no payment
            </p>

            {/* Gold-gradient CTA */}
            <button
              onClick={toggle}
              disabled={loading}
              className="mt-4 w-full max-w-[260px] inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-[14px] font-semibold text-black transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              style={{
                background: "linear-gradient(135deg, #E7D2A8 0%, #C5A87C 50%, #9c7f54 100%)",
                boxShadow: "0 0 30px rgba(197,168,124,0.45), inset 0 1px 0 rgba(255,255,255,0.5)",
              }}
            >
              <Crown className="w-4 h-4" />
              {loading ? "Activating…" : billing === "annual" ? "Activate Annual Premium" : "Activate Premium"}
            </button>
            <p className="mt-2 text-[10px] text-gold/70 tracking-wide">
              ✦ Instant access · 7-day reflection included
            </p>
          </div>
        </div>
      </ShellCard>

      {/* Testimonial */}
      <Testimonial />

      <PremiumPerksGrid />

      {/* Comprehensive grouped comparison */}
      <FullComparison premium={false} />

      {/* FAQ */}
      <div>
        <h3 className="text-[13px] font-medium text-ink uppercase tracking-[0.14em] mb-3 px-1">
          Questions, answered
        </h3>
        <GlassCard className="overflow-hidden">
          {FAQ.map((item, i) => (
            <div key={i}>
              {i > 0 && <Divider />}
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left"
              >
                <span className="text-[13px] font-medium text-ink leading-[17px]">{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-ink-muted shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence initial={false}>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-4 text-[12px] text-ink-muted leading-[18px]">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </GlassCard>
      </div>

      <GlassCard className="p-3.5">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-3.5 h-3.5 text-leaf mt-0.5 shrink-0" />
          <p className="text-[11px] leading-[15px] text-ink-muted">
            Demo build — no payment is processed. Premium is stored on this device only.
            In production this would connect to a real billing provider.
          </p>
        </div>
      </GlassCard>

      <ReplayOnboarding />
    </div>
  );
}

/* ============================================================
   FULL COMPARISON — grouped by pillar with section headers
   ============================================================ */

function FullComparison({ premium }: { premium: boolean }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[13px] font-medium text-ink uppercase tracking-[0.14em]">
          {premium ? "What you've unlocked" : "Free vs Premium"}
        </h3>
        <span className="text-[10px] text-ink-muted">Full breakdown</span>
      </div>

      {GROUPS.map((group, gi) => {
        const Icon = group.icon;
        return (
          <motion.div
            key={group.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * gi }}
          >
            <GlassCard className="overflow-hidden">
              {/* Group header */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/5" style={{ background: `${group.color}08` }}>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${group.color}1a`, border: `1px solid ${group.color}40` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: group.color }} />
                </div>
                <span className="text-[12px] font-medium text-ink tracking-wide">{group.label}</span>
                <span className="ml-auto text-[10px] text-ink-muted">{group.rows.length} features</span>
              </div>
              {/* Rows */}
              <div className="px-4 py-1">
                {group.rows.map((row, i) => (
                  <div key={i}>
                    {i > 0 && <Divider />}
                    <div className="flex items-center gap-2 py-2.5">
                      <div className="flex-1 min-w-0 text-[12px] text-ink-muted leading-[15px]">
                        {row.feature}
                      </div>
                      <div className="w-16 text-right text-[11px] flex items-center justify-end gap-1">
                        <CellRender value={row.free} premium={false} />
                      </div>
                      <div className="w-24 text-right text-[11px] flex items-center justify-end gap-1">
                        <CellRender value={row.premium} premium={true} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        );
      })}

      {/* Column legend */}
      <div className="flex justify-between px-4 text-[10px] uppercase tracking-[0.16em]">
        <span className="text-ink-muted">Free</span>
        <span className="text-gold">Premium</span>
      </div>
    </div>
  );
}

function CellRender({ value, premium }: { value: Cell; premium: boolean }) {
  if (value === true) {
    return <Check className={`w-3.5 h-3.5 ${premium ? "text-gold" : "text-leaf"}`} />;
  }
  if (value === false) {
    return <X className="w-3.5 h-3.5 text-ink-muted/40" />;
  }
  return (
    <span className={premium ? "text-gold font-medium" : "text-ink-muted"} style={{ fontSize: "11px" }}>
      {value === true ? <InfinityIcon className="w-3.5 h-3.5" /> : value}
    </span>
  );
}

function ReplayOnboarding() {
  const { toast } = useToast();
  function replay() {
    try { localStorage.removeItem("lumina.onboarded"); } catch {}
    toast({ title: "Onboarding reset", description: "Reloading…" });
    setTimeout(() => window.location.reload(), 600);
  }
  return (
    <button
      onClick={replay}
      className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] text-ink-muted hover:text-ink tracking-wide transition-colors"
    >
      <RotateCcw className="w-3 h-3" />
      Replay the intro
    </button>
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

function Testimonial() {
  const quotes = [
    { text: "Lumina became my morning ritual. The 888 Hz tone while I confirm my goal has changed how I walk into my day.", author: "Mira R.", role: "Premium member · 4 mo" },
  ];
  const q = quotes[0];
  return (
    <GlassCard className="p-4 relative overflow-hidden">
      <div className="absolute -top-4 -left-2 text-[60px] leading-none text-gold/15 font-serif select-none">"</div>
      <div className="relative z-10">
        <div className="flex items-center gap-0.5 mb-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className="w-3 h-3 text-gold fill-gold" />
          ))}
        </div>
        <p className="text-[13px] leading-[20px] text-ink italic">{q.text}</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C5A87C] to-[#7A8680]" />
          <div>
            <div className="text-[12px] font-medium text-ink">{q.author}</div>
            <div className="text-[10px] text-ink-muted">{q.role}</div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
