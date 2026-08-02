"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Crown, RotateCcw, Trash2, ShieldCheck, Bell, Smartphone,
  Sparkles, Target, AudioLines, ChevronRight, Check, AlertCircle, Info, BarChart3, Download, Volume2, VolumeX, Lock,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { useSoundEnabled, useSound } from "@/hooks/use-sound";
import { useRitual } from "@/hooks/use-ritual";
import { useAchievements } from "@/hooks/use-achievements";
import { useLuminaTheme, type LuminaTheme } from "@/lib/theme";
import { HallOfLight } from "@/components/lumina/hall-of-light";
import StatsView from "@/features/stats/stats-view";
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
  const setPremiumPageOpen = useAppStore((s) => s.setPremiumPageOpen);
  const [premiumOpen, setPremiumOpen] = React.useState(false);
  const [clearOpen, setClearOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [showStats, setShowStats] = React.useState(false);

  const { data } = useQuery<MeData>({
    queryKey: ["me"],
    queryFn: async () => (await api("/api/me")).json(),
  });
  const { ritual, streak: ritualStreak } = useRitual();
  const { allComplete } = useAchievements();
  const { theme, setTheme } = useLuminaTheme(allComplete);

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

  async function exportData() {
    try {
      const res = await api("/api/export");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lumina-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Data exported",
        description: `${data.stats.totalReadings} readings, ${data.stats.totalGoals} goals, ${data.stats.totalMoodEntries} moods.`,
      });
    } catch {
      toast({ title: "Export failed", description: "Please try again." });
    }
  }

  return (
    <div className="space-y-5">
      {/* Stats view (inline, with back button) */}
      {showStats ? (
        <div>
          <button
            onClick={() => setShowStats(false)}
            className="flex items-center gap-2 mb-4 text-[12px] text-gold/80 hover:text-gold transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Profile
          </button>
          <StatsView />
        </div>
      ) : (
      <>
      <SectionTitle
        eyebrow="Profile"
        title={<>Your <span className="lum-text-gold">space</span></>}
        subtitle="Manage your practice, premium, and data."
      />

      {/* Profile header — avatar + guest badge + bypass button */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: "radial-gradient(circle at 30% 30%, rgba(197,168,124,0.3), transparent 70%)",
                border: "1.5px solid rgba(197,168,124,0.35)",
              }}
            >
              <span className="text-[24px] font-light text-gold">✦</span>
            </div>
            {/* Name + badge */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-medium text-ink">
                  {data?.device?.displayName || "Guest"}
                </span>
                {!isPremium && (
                  <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted/60 font-medium px-2 py-0.5 rounded-full border border-white/8">
                    Guest
                  </span>
                )}
              </div>
              <div className="text-[11px] text-ink-muted mt-0.5">
                {memberSince ? `Member since ${memberSince}` : "Welcome to Lumina"}
              </div>
            </div>
          </div>
          {/* Bypass / sign-in button (temporary — will be replaced with real auth) */}
          <button
            onClick={() => {
              toast({ title: "Guest mode", description: "You're browsing as a guest. Sign in coming soon." });
            }}
            className="w-full mt-3 rounded-full py-2.5 text-[12px] font-medium text-gold border border-gold/25 bg-gold/5 hover:bg-gold/10 transition-all"
          >
            Enter as Guest
          </button>
        </GlassCard>
      </motion.div>

      {/* Quick stats row — 4 tiles matching old practice summary */}
      {data?.usage && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <GlassCard className="p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-gold/80 font-medium mb-3">
              Your practice
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PracticeStat icon={Sparkles} label="Readings today" value={data.usage.tarotReadings ?? 0} accent="#C5A87C" />
              <PracticeStat icon={Target} label="Active goals" value={data.usage.activeGoals ?? 0} accent="#B5CD7E" />
              <PracticeStat icon={Check} label="Confirmed today" value={data.usage.confirmedToday ?? 0} accent="#B5CD7E" />
              <PracticeStat icon={AudioLines} label="Freq. seconds" value={data.usage.frequencySec ?? 0} accent="#9E8AC9" />
            </div>
            <Divider className="my-3" />
            <div className="flex items-center justify-between text-[11px] text-ink-muted">
              <span>Member since</span>
              <span className="text-ink font-medium">{memberSince}</span>
            </div>
          </GlassCard>
        </motion.div>
      )}

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
                  {isPremium && (
                    <div
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-semibold tracking-wide"
                      style={{
                        background: "linear-gradient(135deg, rgba(181,205,126,0.25), rgba(181,205,126,0.10))",
                        border: "1px solid rgba(181,205,126,0.5)",
                        boxShadow: "0 0 12px rgba(181,205,126,0.2), inset 0 1px 0 rgba(181,205,126,0.15)",
                      }}
                    >
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: "#B5CD7E", boxShadow: "0 0 6px #B5CD7E" }}
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <span style={{ color: "#B5CD7E" }}>ACTIVE</span>
                    </div>
                  )}
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
                <GoldButton onClick={() => setPremiumPageOpen(true)} className="w-full">
                  <Crown className="w-4 h-4" /> Upgrade to Premium
                </GoldButton>
              )}
            </div>
          </div>
        </ShellCard>
      </motion.div>

      {/* Achievement Badges */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <AchievementBadges
          isPremium={!!data?.device?.isPremium}
          readingsToday={data?.usage?.tarotReadings ?? 0}
          confirmedToday={data?.usage?.confirmedToday ?? 0}
          activeGoals={data?.usage?.activeGoals ?? 0}
          freqSec={data?.usage?.frequencySec ?? 0}
          streak={ritualStreak}
          ritual={ritual}
        />
      </motion.div>

      {/* Mastery Rewards — Hall of Light + Luminary Theme + Secret Frequencies (only when all 36 unlocked) */}
      {allComplete && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
          <MasteryRewards theme={theme} onThemeChange={setTheme} />
        </motion.div>
      )}

      {/* Quick links */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="overflow-hidden">
          <SoundToggleRow />
          <Divider />
          <SettingsRow icon={RotateCcw} label="Replay the intro" desc="See the onboarding again" onClick={replayOnboarding} />
          <Divider />
          <SettingsRow icon={Crown} label="Premium comparison" desc="See what's included" onClick={() => setPremiumPageOpen(true)} />
          <Divider />
          <SettingsRow icon={BarChart3} label="Your stats" desc="Journey, mood & patterns" onClick={() => setShowStats(true)} />
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
            icon={Download}
            label="Export your data"
            desc="Download all readings, goals & moods as JSON"
            onClick={exportData}
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
      </>
      )}
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

/**
 * MasteryRewards — the Luminary reward panel shown when all 36 achievements are unlocked.
 * Contains: Hall of Light constellation, Luminary Theme toggle, and a Secret Frequencies pointer.
 */
function MasteryRewards({
  theme,
  onThemeChange,
}: {
  theme: LuminaTheme;
  onThemeChange: (t: LuminaTheme) => void;
}) {
  const setTab = useAppStore((s) => s.setTab);
  const masteryDate = React.useMemo(() => {
    try {
      return localStorage.getItem("lumina.masteryCelebrated") || new Date().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }, []);

  const goldGrad = "linear-gradient(135deg, #FBEFC8, #D4B27A, #8A6A2F)";

  return (
    <div className="space-y-4">
      {/* Mastery banner */}
      <ShellCard className="overflow-hidden">
        <div className="relative p-5 lum-glow-gold text-center">
          {/* Animated light rays */}
          <motion.div
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-px origin-bottom"
                style={{
                  height: "160px",
                  background: "linear-gradient(to top, transparent, rgba(197,168,124,0.1), transparent)",
                  transform: `rotate(${i * 45}deg) translateY(-80px)`,
                }}
              />
            ))}
          </motion.div>
          <div className="relative z-10">
            <motion.div
              className="w-16 h-16 mx-auto mb-3 relative flex items-center justify-center"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(197,168,124,0.3), transparent 70%)",
                  border: "1.5px solid rgba(197,168,124,0.4)",
                  boxShadow: "0 0 30px rgba(197,168,124,0.4)",
                }}
              />
              <svg width="36" height="36" viewBox="0 0 72 72" fill="none" className="relative z-10">
                <defs>
                  <linearGradient id="mr-crown" x1="14" y1="10" x2="58" y2="62" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FBEFC8" />
                    <stop offset="55%" stopColor="#D4B27A" />
                    <stop offset="100%" stopColor="#8A6A2F" />
                  </linearGradient>
                </defs>
                <path d="M14 50 L18 26 L28 38 L36 22 L44 38 L54 26 L58 50 Z" fill="url(#mr-crown)" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="0.6" strokeLinejoin="round" />
                <rect x="14" y="48" width="44" height="6" rx="1.5" fill="url(#mr-crown)" stroke="#FFFFFF" strokeOpacity="0.3" strokeWidth="0.5" />
                <circle cx="36" cy="22" r="2.4" fill="#FFFFFF" fillOpacity="0.95" />
              </svg>
            </motion.div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-gold font-medium mb-1">✦ Luminary Status ✦</div>
            <h3 className="text-[20px] font-light text-ink leading-[24px] mb-1">
              All <span style={{ background: goldGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>36 achievements</span> complete
            </h3>
            <p className="text-[11px] text-ink-muted leading-[15px] max-w-[280px] mx-auto">
              You have walked the full path. Three sacred rewards are now yours.
            </p>
          </div>
        </div>
      </ShellCard>

      {/* Hall of Light */}
      <HallOfLight unlockedAt={masteryDate} />

      {/* Luminary Theme toggle */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-gradient-to-b from-gold to-gold/30" />
            <h3 className="text-[12px] uppercase tracking-[0.2em] text-gold font-medium">Luminary Theme</h3>
          </div>
          {theme === "luminary" && <Pill variant="gold">Active</Pill>}
        </div>
        <p className="text-[11px] text-ink-muted leading-[15px] mb-3">
          A warm, radiant gold-tinted theme with floating particle effects — exclusive to Luminaries.
        </p>
        {/* Theme toggle — two options */}
        <div className="flex gap-2">
          <button
            onClick={() => onThemeChange("dark")}
            className={`flex-1 rounded-xl p-3 border transition-all ${
              theme === "dark"
                ? "border-white/20 bg-white/[0.04]"
                : "border-white/8 bg-transparent hover:border-white/12"
            }`}
          >
            <div className="w-full h-8 rounded-md mb-2" style={{ background: "linear-gradient(135deg, #000000, #121815)" }} />
            <div className="text-[11px] font-medium text-ink">Midnight</div>
            <div className="text-[9px] text-ink-muted">The original dark</div>
          </button>
          <button
            onClick={() => onThemeChange("luminary")}
            className={`flex-1 rounded-xl p-3 border transition-all ${
              theme === "luminary"
                ? "border-gold/50 bg-gold/[0.08]"
                : "border-gold/15 bg-transparent hover:border-gold/25"
            }`}
            style={theme === "luminary" ? { boxShadow: "0 0 16px rgba(197,168,124,0.2)" } : undefined}
          >
            <div className="w-full h-8 rounded-md mb-2" style={{ background: "linear-gradient(135deg, #0A0805, #1A140C)", boxShadow: "inset 0 0 8px rgba(231,210,168,0.15)" }} />
            <div className="text-[11px] font-medium text-gold">Luminary</div>
            <div className="text-[9px] text-ink-muted">Warm gold radiance</div>
          </button>
        </div>
      </GlassCard>

      {/* Secret Frequencies pointer */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-gradient-to-b from-gold to-gold/30" />
            <h3 className="text-[12px] uppercase tracking-[0.2em] text-gold font-medium">Secret Frequencies</h3>
          </div>
          <Pill variant="gold">3 unlocked</Pill>
        </div>
        <p className="text-[11px] text-ink-muted leading-[15px] mb-3">
          The three crown jewels of the Solfeggio scale — 963 Hz, 432 Hz, and 528 Hz — reserved for Luminaries.
        </p>
        <button
          onClick={() => setTab("frequency")}
          className="w-full rounded-full px-4 py-2.5 text-[12px] font-medium text-black active:scale-[0.98] transition-all"
          style={{ background: goldGrad }}
        >
          ✦ Open Secret Frequencies
        </button>
      </GlassCard>
    </div>
  );
}

/**
 * Achievement Badges — 36 unlockable milestones (18 free + 18 premium).
 * Premium SVG icons with colors baked into gradients (no currentColor).
 * Unlocked: vibrant SVG displayed directly with a colored glow container.
 * Locked: grayscale + dim CSS filter on the icon (still visible, just desaturated).
 */

type RitualInfo = {
  step1Cleanse: boolean;
  step2Manifest: boolean;
  step3Tarot: boolean;
  step4Balance: boolean;
  completed: boolean;
} | null;

type BadgeCtx = {
  isPremium: boolean;
  readingsToday: number;
  confirmedToday: number;
  activeGoals: number;
  freqSec: number;
  streak: number;
  ritual: RitualInfo;
};

type Badge = {
  id: string;
  name: string;
  svg: string;
  desc: string;
  tier: "free" | "premium";
  color: string;
  unlock: (c: BadgeCtx) => boolean;
};

const BADGES: Badge[] = [
  // ── Free tier (18) ────────────────────────────────────────────
  { id: "first-card",      name: "First Card",     svg: "/badges/first-card.svg",      desc: "Drew your first tarot card",        tier: "free",    color: "#D4B27A", unlock: (c) => c.readingsToday > 0 },
  { id: "card-reader",     name: "Card Reader",    svg: "/badges/card-reader.svg",     desc: "Drew 2+ cards in a day",            tier: "free",    color: "#D4B27A", unlock: (c) => c.readingsToday >= 2 },
  { id: "ritual-keeper",   name: "Ritual Keeper",  svg: "/badges/ritual-keeper.svg",   desc: "Began a daily ritual step",         tier: "free",    color: "#F09A3D", unlock: (c) => !!(c.ritual && (c.ritual.step1Cleanse || c.ritual.step2Manifest || c.ritual.step3Tarot || c.ritual.step4Balance)) },
  { id: "consistent",      name: "Consistent",     svg: "/badges/consistent.svg",      desc: "Confirmed a goal today",            tier: "free",    color: "#A4CC72", unlock: (c) => c.confirmedToday > 0 },
  { id: "resonator",       name: "Resonator",      svg: "/badges/resonator.svg",       desc: "Listened to a frequency",           tier: "free",    color: "#5FA9C7", unlock: (c) => c.freqSec > 0 },
  { id: "goal-setter",     name: "Goal Setter",    svg: "/badges/goal-setter.svg",     desc: "Set a manifestation goal",          tier: "free",    color: "#A4CC72", unlock: (c) => c.activeGoals > 0 },
  { id: "morning-light",   name: "Morning Light",  svg: "/badges/morning-light.svg",   desc: "Practice at sunrise",               tier: "free",    color: "#F09A3D", unlock: (c) => c.readingsToday > 0 || c.confirmedToday > 0 },
  { id: "moon-child",      name: "Moon Child",     svg: "/badges/moon-child.svg",      desc: "Practice after sundown",            tier: "free",    color: "#9B82D6", unlock: (c) => c.freqSec > 0 },
  { id: "mood-tracker",    name: "Mood Keeper",    svg: "/badges/mood-tracker.svg",    desc: "Tune in to how you feel",           tier: "free",    color: "#D876A0", unlock: (c) => c.confirmedToday > 0 },
  { id: "three-spread",    name: "Three Spread",   svg: "/badges/three-spread.svg",    desc: "Complete a 3-card spread",          tier: "free",    color: "#D4B27A", unlock: (c) => c.readingsToday >= 3 },
  { id: "first-frequency", name: "First Tone",     svg: "/badges/first-frequency.svg", desc: "First frequency session",           tier: "free",    color: "#5FA9C7", unlock: (c) => c.freqSec > 0 },
  { id: "breather",        name: "Breather",       svg: "/badges/breather.svg",        desc: "2+ minutes of breathing",           tier: "free",    color: "#A4CC72", unlock: (c) => c.freqSec >= 120 },
  { id: "reveal",          name: "The Reveal",     svg: "/badges/reveal.svg",          desc: "Reveal your card of the day",       tier: "free",    color: "#9B82D6", unlock: (c) => c.readingsToday > 0 },
  { id: "seven-seeker",    name: "Seven Seeker",   svg: "/badges/seven-seeker.svg",    desc: "Reach a 7-day streak",              tier: "free",    color: "#F09A3D", unlock: (c) => c.streak >= 7 },
  { id: "wheel-of-time",   name: "Wheel of Time",  svg: "/badges/wheel-of-time.svg",   desc: "Draw 5+ cards in a day",            tier: "free",    color: "#D4B27A", unlock: (c) => c.readingsToday >= 5 },
  { id: "cleansed",        name: "Cleansed",       svg: "/badges/cleansed.svg",        desc: "Complete the Cleanse step",         tier: "free",    color: "#5FA9C7", unlock: (c) => !!(c.ritual && c.ritual.step1Cleanse) },
  { id: "balanced",        name: "Balanced",       svg: "/badges/balanced.svg",        desc: "Complete the Balance step",         tier: "free",    color: "#9B82D6", unlock: (c) => !!(c.ritual && c.ritual.step4Balance) },
  { id: "asked",           name: "The Ask",        svg: "/badges/asked.svg",           desc: "Complete the Ask step",             tier: "free",    color: "#D4B27A", unlock: (c) => !!(c.ritual && c.ritual.step3Tarot) },
  // ── Premium tier (18) ─────────────────────────────────────────
  { id: "seer",            name: "Seer",           svg: "/badges/seer.svg",            desc: "Complete a Celtic Cross (10 cards)", tier: "premium", color: "#9B82D6", unlock: (c) => c.isPremium && c.readingsToday >= 10 },
  { id: "manifestor",      name: "Manifestor",     svg: "/badges/manifestor.svg",      desc: "Affirm a goal into being",          tier: "premium", color: "#A4CC72", unlock: (c) => c.isPremium && c.confirmedToday > 0 },
  { id: "deep-resonator",  name: "Deep Resonator", svg: "/badges/deep-resonator.svg",  desc: "10-minute frequency session",       tier: "premium", color: "#5FA9C7", unlock: (c) => c.isPremium && c.freqSec >= 600 },
  { id: "ritual-master",   name: "Ritual Master",  svg: "/badges/ritual-master.svg",   desc: "7-day ritual streak",               tier: "premium", color: "#D4B27A", unlock: (c) => c.isPremium && c.streak >= 7 },
  { id: "scholar",         name: "Scholar",        svg: "/badges/scholar.svg",         desc: "Draw 5+ cards in a session",        tier: "premium", color: "#D4B27A", unlock: (c) => c.isPremium && c.readingsToday >= 5 },
  { id: "mystic",          name: "Mystic",         svg: "/badges/mystic.svg",          desc: "Open the full frequency spectrum",  tier: "premium", color: "#9B82D6", unlock: (c) => c.isPremium && c.freqSec > 0 },
  { id: "priestess",       name: "Priestess",      svg: "/badges/priestess.svg",       desc: "Work with the High Priestess",      tier: "premium", color: "#9B82D6", unlock: (c) => c.isPremium && c.readingsToday > 0 },
  { id: "magician",        name: "Magician",       svg: "/badges/magician.svg",        desc: "Work with the Magician",            tier: "premium", color: "#D4B27A", unlock: (c) => c.isPremium && c.readingsToday > 0 },
  { id: "star-bearer",     name: "Star Bearer",    svg: "/badges/star-bearer.svg",     desc: "Work with the Star",                tier: "premium", color: "#F09A3D", unlock: (c) => c.isPremium && c.readingsToday > 0 },
  { id: "world-walker",    name: "World Walker",   svg: "/badges/world-walker.svg",    desc: "Complete a 3+ card spread",         tier: "premium", color: "#A4CC72", unlock: (c) => c.isPremium && c.readingsToday >= 3 },
  { id: "sun-child",       name: "Sun Child",      svg: "/badges/sun-child.svg",       desc: "Affirm under the Sun",              tier: "premium", color: "#F09A3D", unlock: (c) => c.isPremium && c.confirmedToday > 0 },
  { id: "moon-walker",     name: "Moon Walker",    svg: "/badges/moon-walker.svg",     desc: "Resonate with the Moon",            tier: "premium", color: "#9B82D6", unlock: (c) => c.isPremium && c.freqSec > 0 },
  { id: "tower-breaker",   name: "Tower Breaker",  svg: "/badges/tower-breaker.svg",   desc: "Break through with the Tower",      tier: "premium", color: "#F09A3D", unlock: (c) => c.isPremium && c.readingsToday >= 5 },
  { id: "phoenix",         name: "Phoenix",        svg: "/badges/phoenix.svg",         desc: "Transform with Death",              tier: "premium", color: "#D876A0", unlock: (c) => c.isPremium && c.confirmedToday > 0 },
  { id: "empress",         name: "Empress",        svg: "/badges/empress.svg",         desc: "Nurture a goal with the Empress",   tier: "premium", color: "#D876A0", unlock: (c) => c.isPremium && c.activeGoals > 0 },
  { id: "emperor",         name: "Emperor",        svg: "/badges/emperor.svg",         desc: "Structure a goal with the Emperor", tier: "premium", color: "#D4B27A", unlock: (c) => c.isPremium && c.activeGoals > 0 },
  { id: "hermit",          name: "Hermit",         svg: "/badges/hermit.svg",          desc: "Sit with 5+ min of frequency",      tier: "premium", color: "#F09A3D", unlock: (c) => c.isPremium && c.freqSec >= 300 },
  { id: "lovers",          name: "The Lovers",     svg: "/badges/lovers.svg",          desc: "Unite intention and feeling",       tier: "premium", color: "#D876A0", unlock: (c) => c.isPremium && c.confirmedToday > 0 },
];

function AchievementBadges({
  isPremium,
  readingsToday,
  confirmedToday,
  activeGoals,
  freqSec,
  streak,
  ritual,
}: {
  isPremium: boolean;
  readingsToday: number;
  confirmedToday: number;
  activeGoals: number;
  freqSec: number;
  streak: number;
  ritual: RitualInfo;
}) {
  const [tier, setTier] = React.useState<"all" | "free" | "premium">("all");
  const [selected, setSelected] = React.useState<Badge | null>(null);

  const ctx: BadgeCtx = React.useMemo(
    () => ({ isPremium, readingsToday, confirmedToday, activeGoals, freqSec, streak, ritual }),
    [isPremium, readingsToday, confirmedToday, activeGoals, freqSec, streak, ritual],
  );

  const withStatus = React.useMemo(
    () => BADGES.map((b) => ({ ...b, unlocked: b.unlock(ctx) })),
    [ctx],
  );
  const unlockedCount = withStatus.filter((b) => b.unlocked).length;
  const visible = tier === "all" ? withStatus : withStatus.filter((b) => b.tier === tier);

  const freeUnlocked = withStatus.filter((b) => b.tier === "free" && b.unlocked).length;
  const premiumUnlocked = withStatus.filter((b) => b.tier === "premium" && b.unlocked).length;

  return (
    <GlassCard className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-gold to-gold/30" />
          <h3 className="text-[12px] uppercase tracking-[0.2em] text-gold font-medium">Achievements</h3>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[13px] font-light text-ink tabular-nums">{unlockedCount}</span>
          <span className="text-[10px] text-ink-muted">/ {BADGES.length} unlocked</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden mb-4">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, #C5A87C, #B5CD7E, #9E8AC9)" }}
          initial={{ width: 0 }}
          animate={{ width: `${(unlockedCount / BADGES.length) * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>

      {/* Tier filter pills */}
      <div className="flex items-center gap-1.5 mb-3 p-0.5 rounded-full bg-white/[0.025] border border-white/[0.04]">
        {([
          { k: "all", label: "All", count: unlockedCount, total: BADGES.length },
          { k: "free", label: "Free", count: freeUnlocked, total: 18 },
          { k: "premium", label: "Premium", count: premiumUnlocked, total: 18 },
        ] as const).map((p) => (
          <button
            key={p.k}
            onClick={() => setTier(p.k)}
            className={`flex-1 rounded-full py-1.5 px-2 text-[10.5px] font-medium tracking-wide transition-all ${
              tier === p.k
                ? "bg-gradient-to-b from-gold/25 to-gold/10 text-gold border border-gold/30"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {p.label}
            <span className={`ml-1 tabular-nums ${tier === p.k ? "text-gold/80" : "text-ink-muted/60"}`}>
              {p.count}/{p.total}
            </span>
          </button>
        ))}
      </div>

      {/* Badge grid — scrollable for 36 items */}
      <div
        className="grid grid-cols-3 gap-x-2 gap-y-3 max-h-[360px] overflow-y-auto pr-1 lumina-scroll"
        role="list"
      >
        {visible.map((badge, i) => (
          <motion.button
            key={badge.id}
            role="listitem"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i * 0.02, 0.4) }}
            onClick={() => setSelected(badge)}
            className="flex flex-col items-center text-center group focus:outline-none"
            title={`${badge.name} — ${badge.desc}${badge.unlocked ? " (unlocked)" : " (locked)"}`}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-1.5 relative transition-all duration-300 group-hover:scale-105 group-active:scale-95"
              style={{
                background: badge.unlocked
                  ? `radial-gradient(circle at 30% 30%, ${badge.color}33, ${badge.color}10 60%, transparent 80%)`
                  : "rgba(255,255,255,0.018)",
                border: `1.2px solid ${badge.unlocked ? `${badge.color}66` : "rgba(255,255,255,0.05)"}`,
                boxShadow: badge.unlocked
                  ? `0 0 16px ${badge.color}33, inset 0 0 12px ${badge.color}14`
                  : "inset 0 0 8px rgba(0,0,0,0.4)",
              }}
            >
              {/* Inner medal ring for unlocked */}
              {badge.unlocked && (
                <div
                  className="absolute inset-1 rounded-full pointer-events-none"
                  style={{ border: `0.5px solid ${badge.color}40` }}
                />
              )}
              {/* The SVG icon — displayed directly, no recoloring filter */}
              <img
                src={badge.svg}
                alt=""
                width={36}
                height={36}
                draggable={false}
                className="w-9 h-9 select-none pointer-events-none"
                style={{
                  filter: badge.unlocked
                    ? "drop-shadow(0 1px 2px rgba(0,0,0,0.45))"
                    : "grayscale(0.85) brightness(0.9) opacity(0.6)",
                }}
              />
              {/* Premium lock badge for locked premium-tier badges */}
              {!badge.unlocked && badge.tier === "premium" && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-black border border-gold/40 flex items-center justify-center">
                  <Lock className="w-2 h-2 text-gold/70" />
                </div>
              )}
              {/* Sparkle twinkle for freshly unlocked (purely decorative) */}
              {badge.unlocked && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                  style={{
                    background: badge.color,
                    boxShadow: `0 0 6px ${badge.color}`,
                    opacity: 0.85,
                  }}
                />
              )}
            </div>
            <div
              className="text-[10px] font-medium leading-[12px] max-w-[72px] min-h-[24px] flex items-center justify-center text-center line-clamp-2"
              style={{ color: badge.unlocked ? "#E8EBE9" : "#9CA8A3" }}
            >
              {badge.name}
            </div>
          </motion.button>
        ))}
      </div>

      <Divider className="my-3" />
      <div className="flex items-center justify-between text-[10px] text-ink-muted">
        <span>Tap a badge to see how to earn it.</span>
        {!isPremium && <span className="text-gold/60">Premium unlocks 18 more →</span>}
      </div>

      {/* Detail popover */}
      <BadgeDetail badge={selected} onClose={() => setSelected(null)} isPremium={isPremium} />
    </GlassCard>
  );
}

function BadgeDetail({
  badge,
  onClose,
  isPremium,
}: {
  badge: Badge | null;
  onClose: () => void;
  isPremium: boolean;
}) {
  const isOpen = !!badge;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isOpen ? 1 : 0 }}
      className={`fixed inset-0 z-[80] flex items-end sm:items-center justify-center ${isOpen ? "" : "pointer-events-none"}`}
      onClick={onClose}
    >
      {isOpen && <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />}
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.97 }}
        animate={{ y: isOpen ? 0 : 50, opacity: isOpen ? 1 : 0, scale: isOpen ? 1 : 0.97 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="relative w-full max-w-sm m-3 lum-glass-float rounded-[24px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {badge && (
          <div className="p-6 text-center">
            <div
              className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center relative"
              style={{
                background: badge.unlocked
                  ? `radial-gradient(circle at 30% 30%, ${badge.color}33, ${badge.color}10 60%, transparent 80%)`
                  : "rgba(255,255,255,0.025)",
                border: `1.5px solid ${badge.unlocked ? `${badge.color}66` : "rgba(255,255,255,0.06)"}`,
                boxShadow: badge.unlocked ? `0 0 28px ${badge.color}40, inset 0 0 16px ${badge.color}18` : "none",
              }}
            >
              <img
                src={badge.svg}
                alt=""
                width={48}
                height={48}
                className="w-12 h-12"
                style={{
                  filter: badge.unlocked
                    ? "drop-shadow(0 1px 3px rgba(0,0,0,0.5))"
                    : "grayscale(0.85) brightness(0.9) opacity(0.6)",
                }}
              />
            </div>

            <div className="flex items-center justify-center gap-2 mb-1">
              <span
                className="text-[9.5px] uppercase tracking-[0.18em] font-medium"
                style={{ color: badge.color }}
              >
                {badge.tier === "premium" ? "Premium" : "Free"}
              </span>
              <span className="text-[9.5px] text-ink-muted">·</span>
              <span
                className="text-[9.5px] uppercase tracking-[0.18em] font-medium"
                style={{ color: badge.unlocked ? badge.color : "#9CA8A3" }}
              >
                {badge.unlocked ? "Unlocked" : "Locked"}
              </span>
            </div>

            <h3 className="text-[17px] font-medium text-ink mb-1">{badge.name}</h3>
            <p className="text-[12px] text-ink-muted leading-[17px] max-w-[240px] mx-auto">
              {badge.desc}
            </p>

            <div className="mt-5">
              {!badge.unlocked && badge.tier === "premium" && !isPremium ? (
                <GhostButton onClick={onClose} className="w-full">
                  Premium unlocks this badge
                </GhostButton>
              ) : (
                <GhostButton onClick={onClose} className="w-full">
                  {badge.unlocked ? "Nicely done" : "Keep practicing"}
                </GhostButton>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function SoundToggleRow() {
  const { enabled, toggle } = useSoundEnabled();
  const sound = useSound();
  const Icon = enabled ? Volume2 : VolumeX;
  return (
    <div className="w-full flex items-center gap-3 p-4">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gold/10 border border-gold/20">
        <Icon className="w-4 h-4 text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-ink">Ritual sounds</div>
        <div className="text-[11px] text-ink-muted mt-0.5">
          {enabled ? "Shuffle, flip, bell & chime" : "Silent"}
        </div>
      </div>
      <button
        onClick={() => {
          toggle(!enabled);
          if (!enabled) sound("bell");
        }}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${enabled ? "bg-gold/40" : "bg-white/10"}`}
        aria-label="Toggle sound"
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${enabled ? "left-[22px] bg-gold" : "left-0.5 bg-white/40"}`}
        />
      </button>
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
