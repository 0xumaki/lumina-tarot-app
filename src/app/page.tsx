"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useApi } from "@/hooks/use-api";
import { useAppStore } from "@/lib/store";
import { BottomNav } from "@/components/lumina/bottom-nav";
import { HomeView } from "@/features/home/home-view";
import { TarotView } from "@/features/tarot/tarot-view";
import { ManifestView } from "@/features/manifest/manifest-view";
import { FrequencyView } from "@/features/frequency/frequency-view";
import { PremiumView } from "@/features/premium/premium-view";
import StatsView from "@/features/stats/stats-view";
import { SettingsView } from "@/features/settings/settings-view";
import { PremiumModal } from "@/features/premium/premium-modal";
import { Onboarding, hasOnboarded } from "@/components/lumina/onboarding";

export default function Page() {
  const api = useApi();
  const tab = useAppStore((s) => s.tab);
  const setTab = useAppStore((s) => s.setTab);
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
    if (t && ["home", "tarot", "manifest", "frequency", "stats", "premium", "settings"].includes(t)) {
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

  const isPremium = !!data?.device?.isPremium;
  const remaining = data?.usage?.remainingTarot ?? null;

  if (!onboarded) {
    return <Onboarding onDone={() => setOnboarded(true)} />;
  }

  return (
    <div className="lum-aurora relative min-h-[100dvh] flex flex-col bg-black">
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
              onClick={() => setTab("settings")}
              className="lum-pill-gold text-[10px] hover:bg-gold/20 transition-colors"
            >
              ✦ Premium
            </button>
          ) : (
            <button
              onClick={() => setTab("premium")}
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
              {tab === "home" && <HomeView onOpenPremium={() => setPremiumOpen(true)} />}
              {tab === "tarot" && <TarotView isPremium={isPremium} remaining={remaining} />}
              {tab === "manifest" && <ManifestView isPremium={isPremium} />}
              {tab === "frequency" && <FrequencyView isPremium={isPremium} />}
              {tab === "premium" && <PremiumView />}
              {tab === "stats" && <StatsView />}
              {tab === "settings" && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <BottomNav />
      <PremiumModal open={premiumOpen} onOpenChange={setPremiumOpen} />
    </div>
  );
}
