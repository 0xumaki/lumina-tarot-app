"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Sparkles, Target, AudioLines, BarChart3, Crown } from "lucide-react";
import { useAppStore, type TabKey } from "@/lib/store";
import { cn } from "@/lib/utils";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "home", label: "Today", icon: Home },
  { key: "tarot", label: "Tarot", icon: Sparkles },
  { key: "manifest", label: "Manifest", icon: Target },
  { key: "frequency", label: "Tones", icon: AudioLines },
  { key: "stats", label: "Stats", icon: BarChart3 },
  { key: "premium", label: "Premium", icon: Crown },
];

export function BottomNav() {
  const tab = useAppStore((s) => s.tab);
  const setTab = useAppStore((s) => s.setTab);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 lum-safe-bottom"
      aria-label="Primary"
    >
      <div className="mx-auto max-w-md px-3 pb-2 pt-1">
        <div className="lum-glass-float rounded-[28px] px-1.5 py-1.5 flex items-center justify-between">
          {TABS.map((t) => {
            const active = tab === t.key;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex-1 flex flex-col items-center justify-center gap-0.5 rounded-[22px] py-2 transition-colors",
                  active ? "text-gold" : "text-ink-muted hover:text-ink"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-[22px] bg-gold/10 border border-gold/20"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon
                  className="relative z-10"
                  style={{ width: 18, height: 18, strokeWidth: active ? 2 : 1.5 }}
                />
                <span
                  className="relative z-10 text-[10px] font-medium tracking-[0.02em]"
                  style={{ opacity: active ? 1 : 0.7 }}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
