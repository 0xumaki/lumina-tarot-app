"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Target, AudioLines, Crown, Flame, ChevronRight, Sun, Moon, Star,
  Bell, Smartphone, ShieldCheck, Check,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { GlassCard, ShellCard, GoldButton, GhostButton, Pill, SectionTitle, Divider } from "@/components/lumina/primitives";
import { CardOfDay } from "@/components/lumina/card-of-day";
import { StreakRing } from "@/components/lumina/streak-ring";
import { MoodCheckIn } from "@/components/lumina/mood-check-in";
import { WeeklyTeaser } from "@/components/lumina/weekly-teaser";
import { MoonPhase } from "@/components/lumina/moon-phase";
import { PositivityGenerator } from "@/components/lumina/positivity-generator";
import { useRitual } from "@/hooks/use-ritual";
import { useAppStore, type TabKey } from "@/lib/store";
import { useNotificationPermission } from "@/hooks/use-notifications";

type MeData = {
  device: { id: string; isPremium: boolean; displayName: string | null; createdAt: string };
  usage: {
    date: string;
    tarotReadings: number;
    remainingTarot: number | null;
    frequencySec: number;
    activeGoals: number;
    confirmedToday: number;
  };
  limits: { tarotReadingsPerDay: number | null; manifestGoals: number | null; frequencySecondsPerSession: number | null };
};

export function HomeView({ onOpenPremium }: { onOpenPremium: () => void }) {
  const api = useApi();
  const setTab = useAppStore((s) => s.setTab);
  const notif = useNotificationPermission();

  const { data } = useQuery<MeData>({
    queryKey: ["me"],
    queryFn: async () => (await api("/api/me")).json(),
    refetchInterval: 15000,
  });

  // Lightweight goals fetch to get the best streak for the hero ring
  const { data: goalsData } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => (await api("/api/manifest/goals")).json(),
    refetchInterval: 30000,
  });
  const bestStreak = React.useMemo(() => {
    const goals = goalsData?.goals as any[] | undefined;
    if (!goals || goals.length === 0) return 0;
    return Math.max(0, ...goals.map((g) => g.streak ?? 0));
  }, [goalsData]);

  const isPremium = !!data?.device?.isPremium;
  const usage = data?.usage;
  const greeting = useGreeting();
  const { ritual, streak: ritualStreak } = useRitual();

  const ritualSteps = [
    ritual.step1Cleanse,
    ritual.step2Manifest,
    ritual.step3Tarot,
    ritual.step4Balance,
  ];

  const quickActions: { key: TabKey; step: number; label: string; desc: string; icon: any; accent: string; ritual: string; done: boolean; optional?: boolean }[] = [
    { key: "frequency", step: 1, label: "Cleanse", desc: isPremium ? "Unlimited" : "30s free", icon: AudioLines, accent: "#9E8AC9", ritual: "Tune your energy", done: ritualSteps[0] },
    { key: "manifest", step: 2, label: "Manifest", desc: `${usage?.confirmedToday ?? 0} today`, icon: Target, accent: "#B5CD7E", ritual: "Affirm your desire", done: ritualSteps[1] },
    { key: "tarot", step: 3, label: "Ask the cards", desc: usage?.remainingTarot === null ? "Unlimited" : `${usage?.remainingTarot ?? 2} free left`, icon: Sparkles, accent: "#C5A87C", ritual: "Seek guidance", done: ritualSteps[2], optional: true },
    { key: "frequency", step: 4, label: "Balance", desc: "Reinforce & breathe", icon: AudioLines, accent: "#9E8AC9", ritual: "Energy balancing", done: ritualSteps[3] },
  ];

  return (
    <div className="space-y-5">
      {/* Hero */}
      <ShellCard className="overflow-hidden">
        <div className="relative p-5 lum-glow-gold">
          {/* Breathing glow layer */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(60% 50% at 30% 20%, rgba(197,168,124,0.10) 0%, transparent 70%)",
            }}
            animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-gold/80 font-medium">
                  {greeting.eyebrow}
                </div>
                <h1 className="mt-1 text-[24px] leading-[30px] font-light tracking-[-0.025em] text-ink">
                  {greeting.title}
                </h1>
              </div>
              <CelestialIcon hour={new Date().getHours()} />
            </div>
            <p className="mt-2 text-[13px] leading-[18px] text-ink-muted max-w-[280px]">
              {greeting.subtitle}
            </p>

            {/* Daily streak + status strip */}
            <div className="mt-5 flex items-center gap-3">
              <button onClick={() => setTab("manifest")} className="shrink-0" aria-label="View your manifestation goals">
                <StreakRing streak={bestStreak ?? 0} size={56} />
              </button>
              <button onClick={() => setTab("manifest")} className="flex-1 min-w-0 text-left">
                <div className="text-[13px] font-medium text-ink leading-[16px]">
                  {bestStreak && bestStreak > 0 ? `${bestStreak}-day streak` : "Begin a streak today"}
                </div>
                <div className="text-[11px] text-ink-muted mt-0.5">
                  {usage?.confirmedToday ?? 0} confirmed today
                  {bestStreak && bestStreak >= 7 ? " · flame lit" : ""}
                </div>
              </button>
              {isPremium ? (
                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-wide transition-all hover:scale-105"
                  style={{
                    background: "linear-gradient(135deg, rgba(231,210,168,0.25), rgba(197,168,124,0.12))",
                    border: "1px solid rgba(231,210,168,0.5)",
                    boxShadow: "0 0 16px rgba(197,168,124,0.25), inset 0 1px 0 rgba(231,210,168,0.15)",
                  }}
                >
                  <Crown className="w-3 h-3" style={{ color: "#E7D2A8" }} strokeWidth={2} />
                  <span style={{ background: "linear-gradient(135deg, #FBEFC8, #D4B27A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                    PREMIUM
                  </span>
                </div>
              ) : (
                <button onClick={onOpenPremium} className="group">
                  <div
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-wide transition-all group-hover:scale-105"
                    style={{
                      background: "linear-gradient(135deg, rgba(231,210,168,0.15), rgba(197,168,124,0.08))",
                      border: "1px solid rgba(197,168,124,0.35)",
                      boxShadow: "0 0 12px rgba(197,168,124,0.15)",
                    }}
                  >
                    <Crown className="w-3 h-3 text-gold" strokeWidth={2} />
                    <span className="text-gold">Go Premium</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </ShellCard>

      {/* Positivity Generator — start your day with intention */}
      <PositivityGenerator isPremium={isPremium} />

      {/* Moon Phase — lunar guidance */}
      <MoonPhase onSuggest={() => setTab("frequency")} />

      {/* Your Ritual — numbered flow cards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-gold to-gold/30" />
          <h3 className="text-[12px] uppercase tracking-[0.2em] text-gold/80 font-medium">Your Ritual</h3>
        </div>
        <div className="space-y-2.5">
          {quickActions.map((a, i) => {
            const Icon = a.icon;
            const imageMap: Record<string, string> = {
              tarot: "/images/action-tarot.jpg",
              manifest: "/images/action-manifest.jpg",
              frequency: "/images/action-frequency.jpg",
            };
            const img = imageMap[a.key] || "";
            return (
              <motion.button
                key={`${a.key}-${a.step}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                onClick={() => setTab(a.key)}
                className="text-left group w-full"
              >
                <div className="relative rounded-2xl overflow-hidden h-[88px] border border-white/8 hover:border-white/20 transition-all">
                  {/* Background image — dimmed for text legibility */}
                  <img
                    src={img}
                    alt={a.label}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    style={{ filter: "brightness(0.45)" }}
                  />
                  {/* Dark gradient overlay — full coverage for readability */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(90deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 50%, rgba(0,0,0,0.55) 100%)",
                    }}
                  />
                  {/* Accent glow on right */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-20 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at right, ${a.accent}18, transparent 70%)` }}
                  />
                  {/* Content */}
                  <div className="relative z-10 h-full flex items-center gap-3 p-3.5">
                    {/* Step number badge — shows checkmark when done */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[12px] font-semibold transition-all"
                      style={{
                        background: a.done ? `${a.accent}30` : `${a.accent}20`,
                        border: `1px solid ${a.done ? a.accent : `${a.accent}50`}`,
                        color: a.accent,
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      {a.done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : a.step}
                    </div>
                    {/* Icon */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: `${a.accent}15`, border: `1px solid ${a.accent}33` }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: a.accent }} />
                    </div>
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="text-[14px] font-medium text-white leading-[16px]">{a.label}</div>
                        {a.optional && !a.done && (
                          <span className="text-[9px] uppercase tracking-[0.1em] text-white/80 border border-white/30 rounded-full px-1.5 py-px">Optional</span>
                        )}
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: a.done ? a.accent : "rgba(255,255,255,0.85)" }}>
                        {a.done ? "✓ Complete" : a.ritual}
                      </div>
                    </div>
                    {/* Desc on right */}
                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-white/75">{a.done ? "" : a.desc}</div>
                    </div>
                    {!a.done && <ChevronRight className="w-4 h-4 text-white/60 group-hover:text-white/90 transition-colors shrink-0" />}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
        {/* Ritual progress ring — visual completion indicator */}
        <div className="flex items-center gap-2 mt-3 px-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
          {ritual.completed ? (
            <div className="flex items-center gap-1.5">
              <motion.div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{
                  background: "radial-gradient(circle, rgba(181,205,126,0.3), transparent 70%)",
                  border: "1.5px solid rgba(181,205,126,0.5)",
                  boxShadow: "0 0 10px rgba(181,205,126,0.3)",
                }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Check className="w-3 h-3 text-leaf" strokeWidth={3} />
              </motion.div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-leaf/80 font-medium">Ritual complete · {ritualStreak}d streak</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {/* Mini progress ring */}
              <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0">
                <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
                <circle
                  cx="10" cy="10" r="8" fill="none" stroke="#C5A87C" strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 8}
                  strokeDashoffset={2 * Math.PI * 8 * (1 - ritualSteps.filter(Boolean).length / 3)}
                  transform="rotate(-90 10 10)"
                  style={{ transition: "stroke-dashoffset 0.5s ease", filter: "drop-shadow(0 0 3px rgba(197,168,124,0.5))" }}
                />
              </svg>
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                {ritualSteps.filter(Boolean).length}/3 required
              </span>
            </div>
          )}
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        </div>
      </div>

      {/* Daily mood check-in */}
      <MoodCheckIn />

      {/* Widget preview */}
      <WidgetPreview isPremium={!!isPremium} confirmedToday={usage?.confirmedToday ?? 0} />

      {/* Notifications setup */}
      {!notif.granted && (
        <GlassCard className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-ink">Enable daily reminders</div>
              <p className="text-[12px] text-ink-muted mt-0.5 leading-[16px]">
                Lumina will nudge you at each goal's chosen time, right on your home screen.
              </p>
              <div className="mt-2.5 flex gap-2">
                <GhostButton onClick={notif.request} className="text-[12px] py-2 px-3">
                  <Bell className="w-3.5 h-3.5" /> Allow notifications
                </GhostButton>
                {notif.supported === false && (
                  <span className="text-[11px] text-ink-muted self-center">Not supported on this device</span>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Install hint */}
      <InstallHint />

      {/* #19: Data backup reminder (after 7 days of usage) */}
      <BackupReminder memberSince={data?.device?.createdAt} />

      {/* Weekly reflection teaser */}
      <WeeklyTeaser />

      {/* Daily card */}
      <CardOfDay />

      {!isPremium && (
        <ShellCard className="p-4 lum-glow-gold">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-gold shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium text-ink">Unlock the full ritual</div>
              <div className="text-[12px] text-ink-muted">Unlimited tarot, goals &amp; frequencies.</div>
            </div>
            <GoldButton onClick={onOpenPremium} className="py-2 px-4 text-[12px]">
              Upgrade
            </GoldButton>
          </div>
        </ShellCard>
      )}
    </div>
  );
}

function useGreeting() {
  const h = new Date().getHours();
  if (h < 5) return { eyebrow: "The deep night", title: "The veil is thin.", subtitle: "A perfect moment for a quiet reading or a low tone." };
  if (h < 12) return { eyebrow: "Good morning", title: "The day is unwritten.", subtitle: "Set your intention, then draw a card to read its opening note." };
  if (h < 17) return { eyebrow: "Good afternoon", title: "The light is steady.", subtitle: "A quick reading or a frequency tune-up fits the hour." };
  if (h < 21) return { eyebrow: "Good evening", title: "The dusk softens.", subtitle: "Confirm your goals and let a frequency settle the body." };
  return { eyebrow: "Good night", title: "The stars are listening.", subtitle: "Binaural tones and a single card before sleep." };
}

function CelestialIcon({ hour }: { hour: number }) {
  if (hour >= 6 && hour < 18) return <Sun className="w-7 h-7 text-gold" style={{ filter: "drop-shadow(0 0 8px rgba(197,168,124,0.5))" }} />;
  if (hour >= 18 && hour < 22) return <Star className="w-6 h-6 text-gold" style={{ filter: "drop-shadow(0 0 8px rgba(197,168,124,0.5))" }} />;
  return <Moon className="w-6 h-6 text-gold" style={{ filter: "drop-shadow(0 0 8px rgba(197,168,124,0.5))" }} />;
}

function WidgetPreview({ isPremium, confirmedToday }: { isPremium: boolean; confirmedToday: number }) {
  return (
    <div>
      <SectionTitle
        eyebrow="Home Screen Widget"
        title={<>Your <span className="lum-text-gold">daily presence</span></>}
        subtitle="A glance at today's ritual — install Lumina to your home screen for the real widget."
        className="mb-3"
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[22px] p-4 bg-gradient-to-br from-[#121815] to-[#050706] border border-white/8 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gold/10 blur-xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.18em] text-gold/70 font-medium">Lumina</div>
              <Sparkles className="w-3 h-3 text-gold" />
            </div>
            <div className="mt-2 text-[28px] font-light leading-none lum-text-gold tabular-nums">{confirmedToday}</div>
            <div className="text-[10px] text-ink-muted mt-1">confirmed today</div>
            <Divider className="my-2.5" />
            <div className="flex items-center gap-1 text-[10px] text-ink-muted">
              <Flame className="w-3 h-3 text-leaf" />
              <span>Tap to draw a card</span>
            </div>
          </div>
        </div>
        <div className="rounded-[22px] p-4 bg-gradient-to-br from-[#121815] to-[#050706] border border-white/8 relative overflow-hidden">
          <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-leaf/10 blur-xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.18em] text-leaf/70 font-medium">888 Hz</div>
              <AudioLines className="w-3 h-3 text-leaf" />
            </div>
            <div className="mt-2 text-[14px] font-medium text-ink leading-tight">Abundance</div>
            <div className="text-[10px] text-ink-muted mt-1">Tap to resonate</div>
            <Divider className="my-2.5" />
            <div className="flex items-center gap-1 text-[10px] text-ink-muted">
              <Target className="w-3 h-3 text-gold" />
              <span>{isPremium ? "Unlimited goals" : "1 active goal"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** #19: Data backup reminder — shows after 7 days of membership */
function BackupReminder({ memberSince }: { memberSince?: string }) {
  const [dismissed, setDismissed] = React.useState(false);
  const api = useApi();
  const { toast } = useToast();

  if (dismissed || !memberSince) return null;
  const daysSince = Math.floor((Date.now() - new Date(memberSince).getTime()) / 86400000);
  if (daysSince < 7) return null;

  return (
    <GlassCard className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-leaf/10 border border-leaf/20 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-leaf" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-ink">Protect your journey</div>
          <p className="text-[11px] text-ink-muted mt-0.5 leading-[15px]">
            You've been with Lumina for {daysSince} days. Export your readings, goals, and moods to keep them safe.
          </p>
          <div className="mt-2 flex gap-2">
            <GhostButton
              className="text-[11px] py-1.5 px-3"
              onClick={async () => {
                try {
                  const res = await api("/api/export");
                  const data = await res.json();
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `lumina-export-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast({ title: "Data exported" });
                  setDismissed(true);
                } catch {}
              }}
            >
              Export now
            </GhostButton>
            <button onClick={() => setDismissed(true)} className="text-[11px] text-ink-muted py-1.5 px-2">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function InstallHint() {
  const [installable, setInstallable] = React.useState(false);
  const [evt, setEvt] = React.useState<any>(null);
  const [installed, setInstalled] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    setInstalled(standalone);
    const handler = (e: any) => {
      e.preventDefault();
      setEvt(e);
      setInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (installed || !installable) return null;

  return (
    <GlassCard className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-leaf/10 border border-leaf/20 flex items-center justify-center shrink-0">
          <Smartphone className="w-4 h-4 text-leaf" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-ink">Install Lumina</div>
          <p className="text-[12px] text-ink-muted mt-0.5 leading-[16px]">
            Add to your home screen for the app experience, daily reminders &amp; widget.
          </p>
          <GoldButton
            className="mt-2.5 py-2 px-4 text-[12px]"
            onClick={() => {
              if (evt) {
                evt.prompt();
                evt.userChoice?.finally(() => setInstallable(false));
              }
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Install app
          </GoldButton>
        </div>
      </div>
    </GlassCard>
  );
}
