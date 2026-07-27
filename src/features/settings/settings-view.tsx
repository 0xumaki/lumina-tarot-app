"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Crown, RotateCcw, Trash2, ShieldCheck, Bell, Smartphone,
  Sparkles, Target, AudioLines, ChevronRight, Check, AlertCircle, Info, BarChart3,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import {
  GlassCard, ShellCard, GoldButton, GhostButton, Pill, SectionTitle, Divider,
} from "@/components/lumina/primitives";
import { PremiumModal } from "@/features/premium/premium-modal";
import { useAppStore } from "@/lib/store";

type MeData = {
  device: { id: string; deviceId: string; isPremium: boolean; displayName: string | null; createdAt: string };
  usage: {
    date: string;
    tarotReadings: number;
    remainingTarot: number | null;
    frequencySec: number;
    activeGoals: number;
    confirmedToday: number;
  };
};

export function SettingsView() {
  const api = useApi();
  const { toast } = useToast();
  const qc = useQueryClient();
  const setTab = useAppStore((s) => s.setTab);
  const [premiumOpen, setPremiumOpen] = React.useState(false);
  const [clearOpen, setClearOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const { data } = useQuery<MeData>({
    queryKey: ["me"],
    queryFn: async () => (await api("/api/me")).json(),
  });

  const isPremium = !!data?.device?.isPremium;
  const memberSince = data?.device?.createdAt
    ? new Date(data.device.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";

  async function togglePremium() {
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
        qc.invalidateQueries({ queryKey: ["me"] });
      }
    } finally {
      setLoading(false);
    }
  }

  function replayOnboarding() {
    try { localStorage.removeItem("lumina.onboarded"); } catch {}
    toast({ title: "Onboarding reset", description: "Reloading…" });
    setTimeout(() => window.location.reload(), 600);
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="More"
        title={<>Your <span className="lum-text-gold">space</span></>}
        subtitle="Manage your practice, premium, and data."
      />

      {/* Premium status card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <ShellCard className="overflow-hidden">
          <div className="relative p-4 lum-glow-gold">
            <div className="relative z-10 flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: isPremium
                    ? "linear-gradient(135deg, #E7D2A8, #9c7f54)"
                    : "radial-gradient(circle at 50% 40%, rgba(197,168,124,0.2), transparent 70%)",
                  border: `1px solid ${isPremium ? "transparent" : "rgba(197,168,124,0.3)"}`,
                  boxShadow: isPremium ? "0 0 24px rgba(197,168,124,0.4)" : "none",
                }}
              >
                <Crown className={`w-6 h-6 ${isPremium ? "text-black" : "text-gold"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-medium text-ink">
                    {isPremium ? "Lumina Premium" : "Free tier"}
                  </span>
                  {isPremium && <Pill variant="gold"><Check className="w-3 h-3" /> Active</Pill>}
                </div>
                <div className="text-[11px] text-ink-muted mt-0.5">
                  {isPremium
                    ? "Unlimited tarot, goals & frequencies."
                    : "2 readings/day · 1 goal · 30s frequencies."}
                </div>
              </div>
            </div>
            <div className="relative z-10 mt-4">
              {isPremium ? (
                <GhostButton onClick={togglePremium} disabled={loading} className="w-full">
                  {loading ? "…" : "Manage subscription"}
                </GhostButton>
              ) : (
                <GoldButton onClick={() => setPremiumOpen(true)} className="w-full">
                  <Crown className="w-4 h-4" /> Upgrade to Premium
                </GoldButton>
              )}
            </div>
          </div>
        </ShellCard>
      </motion.div>

      {/* Practice summary */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-gold/80 font-medium mb-3">
            Your practice
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PracticeStat icon={Sparkles} label="Readings today" value={data?.usage?.tarotReadings ?? 0} accent="#C5A87C" />
            <PracticeStat icon={Target} label="Active goals" value={data?.usage?.activeGoals ?? 0} accent="#B5CD7E" />
            <PracticeStat icon={Check} label="Confirmed today" value={data?.usage?.confirmedToday ?? 0} accent="#B5CD7E" />
            <PracticeStat icon={AudioLines} label="Freq. seconds" value={data?.usage?.frequencySec ?? 0} accent="#9E8AC9" />
          </div>
          <Divider className="my-3" />
          <div className="flex items-center justify-between text-[11px] text-ink-muted">
            <span>Member since</span>
            <span className="text-ink font-medium">{memberSince}</span>
          </div>
        </GlassCard>
      </motion.div>

      {/* Quick links */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="overflow-hidden">
          <SettingsRow icon={RotateCcw} label="Replay the intro" desc="See the onboarding again" onClick={replayOnboarding} />
          <Divider />
          <SettingsRow icon={Crown} label="Premium comparison" desc="See what's included" onClick={() => setTab("premium")} />
          <Divider />
          <SettingsRow icon={BarChart3} label="Your stats" desc="Journey, mood & patterns" onClick={() => setTab("stats")} />
        </GlassCard>
      </motion.div>

      {/* Data management */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <GlassCard className="overflow-hidden">
          <div className="p-4 pb-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-gold/80 font-medium">
              Data & privacy
            </div>
          </div>
          <SettingsRow
            icon={ShieldCheck}
            label="Your data is local"
            desc="Stored on this device only. No account, no email."
            onClick={() => toast({ title: "Private by design", description: "Your readings never leave this device's database." })}
          />
          <Divider />
          <SettingsRow
            icon={Trash2}
            label="Clear all data"
            desc="Erase readings, goals, moods & stats"
            onClick={() => setClearOpen(true)}
            destructive
          />
        </GlassCard>
      </motion.div>

      {/* About */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <GlassCard className="p-4">
          <div className="flex items-start gap-2.5">
            <Info className="w-3.5 h-3.5 text-ink-muted mt-0.5 shrink-0" />
            <div>
              <div className="text-[12px] font-medium text-ink">Lumina · Tarot · Manifest · Tones</div>
              <p className="text-[11px] text-ink-muted leading-[15px] mt-1">
                A mystical daily companion for clarity, desire, and resonance. Built with care for the seeking heart.
              </p>
              <div className="text-[10px] text-ink-muted/60 mt-2">Version 1.0 · PWA</div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      <PremiumModal open={premiumOpen} onOpenChange={setPremiumOpen} />
      <ClearDataModal open={clearOpen} onOpenChange={setClearOpen} />
    </div>
  );
}

function PracticeStat({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number; accent: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: `${accent}1a`, border: `1px solid ${accent}33` }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <div className="text-[16px] font-light text-ink tabular-nums leading-none">{value}</div>
        <div className="text-[10px] text-ink-muted mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  desc,
  onClick,
  destructive,
}: {
  icon: React.ElementType;
  label: string;
  desc: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          destructive ? "bg-destructive/10 border border-destructive/20" : "bg-gold/10 border border-gold/20"
        }`}
      >
        <Icon className={`w-4 h-4 ${destructive ? "text-destructive" : "text-gold"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-medium ${destructive ? "text-destructive" : "text-ink"}`}>{label}</div>
        <div className="text-[11px] text-ink-muted mt-0.5">{desc}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />
    </button>
  );
}

function ClearDataModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const api = useApi();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  async function clearData() {
    setLoading(true);
    try {
      // Clear localStorage + reload to reset device id
      localStorage.clear();
      toast({ title: "Data cleared", description: "Starting fresh." });
      setTimeout(() => window.location.reload(), 800);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: open ? 1 : 0 }}
      className={`fixed inset-0 z-[70] flex items-end sm:items-center justify-center ${open ? "" : "pointer-events-none"}`}
      onClick={() => onOpenChange(false)}
    >
      {open && <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />}
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.97 }}
        animate={{ y: open ? 0 : 50, opacity: open ? 1 : 0, scale: open ? 1 : 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full max-w-md m-3 lum-glass-float rounded-[28px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="text-[18px] font-medium text-ink">Clear all data?</h2>
          <p className="text-[13px] text-ink-muted mt-2 leading-[18px] max-w-[280px] mx-auto">
            This will erase all your readings, goals, moods, confirmations, and stats from this device. This cannot be undone.
          </p>
          <div className="mt-5 space-y-2">
            <button
              onClick={clearData}
              disabled={loading}
              className="w-full rounded-full py-3 text-[14px] font-medium bg-destructive text-white active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? "Clearing…" : "Yes, erase everything"}
            </button>
            <GhostButton onClick={() => onOpenChange(false)} className="w-full">
              Keep my data
            </GhostButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
