"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarDays, ChevronRight } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { GlassCard } from "@/components/lumina/primitives";
import { useAppStore } from "@/lib/store";

/**
 * Weekly reflection teaser — a compact card on the Home screen that shows
 * the theme of this week's AI-generated reflection. Tapping navigates to Stats.
 */
export function WeeklyTeaser() {
  const api = useApi();
  const setTab = useAppStore((s) => s.setTab);

  const { data } = useQuery({
    queryKey: ["weekly-reflection"],
    queryFn: async () => (await api("/api/stats/weekly")).json(),
    staleTime: 600000, // 10 min cache (matches the stats view)
  });

  // Don't render if no reflection (no activity or LLM failed)
  if (!data?.reflection) return null;

  const r = data.reflection;
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setTab("profile")}
      className="block w-full text-left"
    >
      <GlassCard className="p-3.5 flex items-center gap-3 hover:border-gold/30 transition-colors">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: "radial-gradient(circle at 50% 40%, rgba(197,168,124,0.25), transparent 70%)",
            border: "1px solid rgba(197,168,124,0.35)",
          }}
        >
          <CalendarDays className="w-4 h-4 text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-[0.18em] text-gold/80 font-medium">
              This week
            </span>
            <span className="text-[8px] uppercase tracking-[0.14em] text-gold/60 border border-gold/20 rounded-full px-1 py-0.5">
              AI
            </span>
          </div>
          <div className="text-[14px] font-medium text-ink mt-0.5 lum-text-gold leading-[17px] truncate">
            {r.theme}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />
      </GlassCard>
    </motion.button>
  );
}
