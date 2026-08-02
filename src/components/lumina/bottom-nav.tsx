"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Home, Sparkles, Target, AudioLines, User } from "lucide-react";
import { useAppStore, type TabKey } from "@/lib/store";
import { cn } from "@/lib/utils";

// 5 items with Tarot as the hero center button (elevated, gold, circular)
const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "home", label: "Today", icon: Home },
  { key: "manifest", label: "Manifest", icon: Target },
  { key: "tarot", label: "Tarot", icon: Sparkles }, // hero center
  { key: "frequency", label: "Tones", icon: AudioLines },
  { key: "profile", label: "Profile", icon: User },
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
            const isHero = t.key === "tarot";

            // Hero center button — elevated, circular, gold
            if (isHero) {
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  aria-current={active ? "page" : undefined}
                  aria-label="Tarot"
                  className="relative flex flex-col items-center justify-center"
                  style={{ marginTop: "-18px" }}
                >
                  <motion.div
                    className="relative w-14 h-14 rounded-full flex items-center justify-center"
                    style={{
                      background: active
                        ? "linear-gradient(135deg, #FBEFC8, #D4B27A, #8A6A2F)"
                        : "linear-gradient(135deg, rgba(231,210,168,0.25), rgba(197,168,124,0.12))",
                      border: active ? "none" : "1px solid rgba(197,168,124,0.35)",
                      boxShadow: active
                        ? "0 0 24px rgba(197,168,124,0.45), 0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)"
                        : "0 0 12px rgba(197,168,124,0.2), 0 4px 8px rgba(0,0,0,0.2)",
                    }}
                    animate={active ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    <Icon
                      className="relative z-10"
                      style={{
                        width: 24,
                        height: 24,
                        strokeWidth: active ? 2 : 1.5,
                        color: active ? "#050806" : "#C5A87C",
                      }}
                    />
                  </motion.div>
                  <span
                    className="text-[10px] font-medium tracking-[0.02em] mt-1"
                    style={{ color: active ? "#C5A87C" : "#9CA8A3", opacity: active ? 1 : 0.7 }}
                  >
                    {t.label}
                  </span>
                </button>
              );
            }

            // Regular nav buttons
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
                  className="relative z-10 text-[11px] font-medium tracking-[0.02em]"
                  style={{ opacity: active ? 1 : 0.8 }}
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
