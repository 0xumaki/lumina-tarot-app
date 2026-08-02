"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useApi } from "@/hooks/use-api";
import { ChevronLeft } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { BottomNav } from "@/components/lumina/bottom-nav";
import { HomeView } from "@/features/home/home-view";
import { TarotView } from "@/features/tarot/tarot-view";
import { ManifestView } from "@/features/manifest/manifest-view";
import { FrequencyView } from "@/features/frequency/frequency-view";
import { SettingsView } from "@/features/settings/settings-view";
import { PremiumModal } from "@/features/premium/premium-modal";
import { PremiumView } from "@/features/premium/premium-view";
import { Onboarding, hasOnboarded } from "@/components/lumina/onboarding";
import { useReminderService } from "@/hooks/use-reminder-service";
import { useToast } from "@/hooks/use-toast";
import { getOrCreateDeviceId } from "@/hooks/use-api";
import { useRitual } from "@/hooks/use-ritual";
import { MilestoneCelebration } from "@/components/lumina/milestone-celebration";
import { useAchievements } from "@/hooks/use-achievements";
import { CelebrationOverlay } from "@/components/lumina/celebration-overlay";
import { useLuminaTheme } from "@/lib/theme";
import { LuminaryParticles } from "@/components/lumina/luminary-particles";

export default function Page() {
  const api = useApi();
  const tab = useAppStore((s) => s.tab);
  const setTab = useAppStore((s) => s.setTab);
  const premiumPageOpen = useAppStore((s) => s.premiumPageOpen);
  const setPremiumPageOpen = useAppStore((s) => s.setPremiumPageOpen);
  const [premiumOpen, setPremiumOpen] = React.useState(false);
  const [onboarded, setOnboarded] = React.useState(true);

  // Check onboarding on mount (client-only)
  React.useEffect(() => {
    setOnboarded(hasOnboarded());
  }, []);

  // hydrate tab from ?tab= query (for PWA shortcuts)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (t && ["home", "tarot", "manifest", "frequency", "profile"].includes(t)) {
      setTab(t as any);
    }
  }, [setTab]);

  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await (await api("/api/me")).json();
      } catch {
        return null;
      }
    },
    refetchInterval: 30000,
  });

  // Reminder service — websocket connection for goal reminders
  const { toast } = useToast();
  const deviceId = typeof window !== "undefined" ? getOrCreateDeviceId() : null;
  const handleReminder = React.useCallback(
    (r: any) => {
      toast({
        title: `✦ ${r.title}`,
        description: r.statement,
      });
    },
    [toast]
  );
  useReminderService(deviceId, handleReminder);

  // Ritual completion celebration
  const { onRitualComplete } = useRitual();
  const [ritualCelebration, setRitualCelebration] = React.useState<number | null>(null);
  React.useEffect(() => {
    onRitualComplete((streak: number) => {
      // Use streak as the celebration number — milestone-style overlay
      setRitualCelebration(streak);
    });
  }, [onRitualComplete]);

  // Achievement celebration watcher (push to global queue)
  const { allComplete } = useAchievements();
  const { theme } = useLuminaTheme(allComplete);

  const isPremium = !!data?.device?.isPremium;
  const remaining = data?.usage?.remainingTarot ?? null;

  if (!onboarded) {
    return <Onboarding onDone={() => setOnboarded(true)} />;
  }

  return (
    <div className="lum-aurora relative min-h-[100dvh] flex flex-col bg-black">
      {/* Luminary theme particles — only when Luminary theme is active */}
      {theme === "luminary" && <LuminaryParticles />}
      {/* App header */}
      <header className="lum-pt-safe sticky top-0 z-40 px-4 pt-3 pb-2 backdrop-blur-md bg-black/40">
        <div className="mx-auto max-w-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-7 h-7 rounded-full bg-gradient-to-br from-[#E7D2A8] to-[#9c7f54] flex items-center justify-center">
              <span className="text-black text-[13px] leading-none">✦</span>
              <div className="absolute inset-0 rounded-full" style={{ boxShadow: "0 0 12px rgba(197,168,124,0.5)" }} />
            </div>
            <div>
              <div className="text-[15px] font-light tracking-[0.18em] text-ink leading-none">LUMINA</div>
              <div className="text-[9px] uppercase tracking-[0.3em] text-ink-muted mt-0.5">Tarot · Manifest · Tones</div>
            </div>
          </div>
          {isPremium ? (
            <button
              onClick={() => setPremiumPageOpen(true)}
              className="lum-pill-gold text-[10px] hover:bg-gold/20 transition-colors"
            >
              ✦ Premium
            </button>
          ) : (
            <button
              onClick={() => setPremiumPageOpen(true)}
              className="lum-pill-gold text-[10px] hover:bg-gold/20 transition-colors"
            >
              Go Premium
            </button>
          )}
        </div>
      </header>

      {/* Tab content */}
      <main className="flex-1 px-4 pb-44 pt-2 relative z-10">
        <div className="mx-auto max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            >
              {tab === "home" && <HomeView onOpenPremium={() => setPremiumPageOpen(true)} />}
              {tab === "tarot" && <TarotView isPremium={isPremium} remaining={remaining} />}
              {tab === "manifest" && <ManifestView isPremium={isPremium} />}
              {tab === "frequency" && <FrequencyView isPremium={isPremium} />}
              {tab === "profile" && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <BottomNav />
      <PremiumModal open={premiumOpen} onOpenChange={setPremiumOpen} />

      {/* Full-screen comprehensive Premium comparison page — the old 6-tab-era
          PremiumView, restored as a scrollable overlay with a sticky close bar. */}
      <AnimatePresence>
        {premiumPageOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[90] bg-black overflow-y-auto lum-aurora"
          >
            {/* Sticky top bar with back button */}
            <div className="lum-pt-safe sticky top-0 z-10 px-4 pt-3 pb-2 backdrop-blur-md bg-black/60 border-b border-white/5">
              <div className="mx-auto max-w-md flex items-center justify-between">
                <button
                  onClick={() => setPremiumPageOpen(false)}
                  className="flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-ink transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <span className="text-[10px] uppercase tracking-[0.22em] text-gold/70 font-medium">
                  Lumina Premium
                </span>
                <div className="w-12" />
              </div>
            </div>
            {/* The full comprehensive premium page */}
            <div className="mx-auto max-w-md px-4 pt-4 pb-32">
              <PremiumView />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Global celebration overlay (achievements + level-ups) */}
      <CelebrationOverlay />
      {/* Ritual completion celebration overlay */}
      {ritualCelebration !== null && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={() => setRitualCelebration(null)}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="relative mx-4 max-w-xs text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Confetti */}
            {Array.from({ length: 20 }).map((_, i) => {
              const angle = (i / 20) * Math.PI * 2;
              const dist = 100 + Math.random() * 60;
              return (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 4 + Math.random() * 4,
                    height: 4 + Math.random() * 4,
                    background: ["#C5A87C", "#B5CD7E", "#E7D2A8", "#9E8AC9"][i % 4],
                    left: "50%",
                    top: "50%",
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                  animate={{
                    x: Math.cos(angle) * dist,
                    y: Math.sin(angle) * dist + 80,
                    opacity: [1, 1, 0],
                    scale: [0, 1, 0.5],
                    rotate: [0, 180, 360],
                  }}
                  transition={{ duration: 2.5, delay: i * 0.02, ease: "easeOut" }}
                />
              );
            })}
            <div className="lum-glass-float rounded-[28px] p-6 relative overflow-hidden" style={{ boxShadow: "0 0 60px rgba(197,168,124,0.3)" }}>
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 30%, rgba(197,168,124,0.15), transparent 60%)" }} />
              <div className="relative z-10">
                <motion.div
                  className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-[36px] mb-4"
                  style={{
                    background: "radial-gradient(circle at 50% 40%, rgba(197,168,124,0.3), transparent 70%)",
                    border: "2px solid rgba(197,168,124,0.5)",
                    boxShadow: "0 0 30px rgba(197,168,124,0.4)",
                  }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  ✦
                </motion.div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-gold/80 font-medium mb-1">Ritual Sealed</div>
                <div className="text-[24px] font-light text-ink leading-[28px]">
                  Your practice is <span className="lum-text-gold">complete</span>
                </div>
                <div className="mt-2 text-[14px] text-ink-muted">
                  {ritualCelebration}-day ritual streak
                </div>
                <p className="mt-3 text-[12px] text-ink-muted leading-[17px] max-w-[240px] mx-auto">
                  You've cleansed, manifested, and balanced your energy. Return tomorrow to continue the cycle.
                </p>
                <button
                  onClick={() => setRitualCelebration(null)}
                  className="mt-5 rounded-full px-6 py-2.5 text-[13px] font-medium bg-[#E8EBE9] text-black active:scale-[0.98] transition-all"
                >
                  ✦ Continue
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
