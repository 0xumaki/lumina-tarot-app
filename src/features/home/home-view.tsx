"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Target, AudioLines, Crown, Flame, ChevronRight, Sun, Moon, Star,
  Bell, Smartphone, ShieldCheck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { GlassCard, ShellCard, GoldButton, GhostButton, Pill, SectionTitle, Divider } from "@/components/lumina/primitives";
import { CardOfDay } from "@/components/lumina/card-of-day";
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

  const isPremium = data?.device.isPremium;
  const usage = data?.usage;
  const greeting = useGreeting();

  const quickActions: { key: TabKey; label: string; desc: string; icon: any; accent: string }[] = [
    { key: "tarot", label: "Ask the cards", desc: usage?.remainingTarot === null ? "Unlimited" : `${usage?.remainingTarot ?? 2} free left`, icon: Sparkles, accent: "#C5A87C" },
    { key: "manifest", label: "Confirm a goal", desc: `${usage?.confirmedToday ?? 0} today`, icon: Target, accent: "#B5CD7E" },
    { key: "frequency", label: "Tune in", desc: isPremium ? "Unlimited" : "30s free", icon: AudioLines, accent: "#9E8AC9" },
  ];

  return (
    <div className="space-y-5">
      {/* Hero */}
      <ShellCard className="overflow-hidden">
        <div className="relative p-5 lum-glow-gold">
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

            {/* Daily streak strip */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Pill variant="leaf">
                <Flame className="w-3 h-3" />
                {usage?.confirmedToday ?? 0} confirmed today
              </Pill>
              {isPremium ? (
                <Pill variant="gold">
                  <Crown className="w-3 h-3" /> Premium
                </Pill>
              ) : (
                <button onClick={onOpenPremium} className="ml-auto">
                  <Pill variant="gold" className="cursor-pointer hover:bg-gold/20">
                    <Crown className="w-3 h-3" /> Go Premium
                  </Pill>
                </button>
              )}
            </div>
          </div>
        </div>
      </ShellCard>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-2.5">
        {quickActions.map((a, i) => {
          const Icon = a.icon;
          return (
            <motion.button
              key={a.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => setTab(a.key)}
              className="text-left"
            >
              <GlassCard className="p-3.5 flex items-center gap-3 hover:border-white/15 transition-colors">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${a.accent}1a`, border: `1px solid ${a.accent}40` }}
                >
                  <Icon className="w-4 h-4" style={{ color: a.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-ink">{a.label}</div>
                  <div className="text-[11px] text-ink-muted">{a.desc}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted" />
              </GlassCard>
            </motion.button>
          );
        })}
      </div>

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
