"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Sparkles, Loader2, Lock, Flame } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GlassCard, ShellCard, GoldButton } from "@/components/lumina/primitives";
import { useAppStore } from "@/lib/store";
import { POSITIVITY_CATEGORIES, type PositivityCategory, type PositivityScript } from "@/lib/positivity";
import { PositivitySession } from "./positivity-session";

type UsageData = {
  sessionsToday: number;
  remaining: number | null;
  isPremium: boolean;
  limit: number;
  positivityStreak: number;
};

/**
 * PositivityGenerator — home page entry point.
 *
 * Features:
 * - Quick-start: tap a category chip → immediately generates a session (no text needed)
 * - Custom intention: type a desire + optional category → generate
 * - Free tier: 1 session/day (shows remaining count + lock when exhausted)
 * - Premium: unlimited
 */
export function PositivityGenerator({ isPremium }: { isPremium: boolean }) {
  const api = useApi();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedCategory, setSelectedCategory] = React.useState<PositivityCategory | null>(null);
  const [intention, setIntention] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [loadingCategory, setLoadingCategory] = React.useState<PositivityCategory | null>(null);
  const [script, setScript] = React.useState<PositivityScript | null>(null);
  const [frequencyData, setFrequencyData] = React.useState<{ hz: number; name: string } | null>(null);
  const [durationMin, setDurationMin] = React.useState(2);
  const setSessionActive = useAppStore((s) => s.setSessionActive);

  // Fetch usage data
  const { data: usageData } = useQuery<UsageData>({
    queryKey: ["positivity-usage"],
    queryFn: async () => {
      const res = await api("/api/positivity");
      const d = await res.json();
      return d.usage;
    },
    refetchInterval: 30000,
  });

  const remaining = usageData?.remaining;
  const isLocked = !isPremium && remaining === 0;

  async function startSession(category?: PositivityCategory, intentionText?: string) {
    const cat = category || selectedCategory;
    const intent = intentionText || intention.trim();

    if (!cat && !intent) {
      toast({ title: "Choose your intention", description: "Select a category or type your desire." });
      return;
    }

    if (isLocked) {
      toast({
        title: "Daily limit reached",
        description: "You've used your free session today. Upgrade to Premium for unlimited positivity.",
      });
      return;
    }

    setLoading(true);
    setLoadingCategory(cat || null);
    try {
      const res = await api("/api/positivity", {
        method: "POST",
        body: JSON.stringify({
          category: cat,
          intention: intent,
          durationSec: durationMin * 60,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "limit-reached") {
          toast({
            title: "Daily limit reached",
            description: "You've used your free positivity session for today. Come back tomorrow or upgrade to Premium.",
          });
        } else {
          toast({ title: "Could not generate", description: data.error || "Please try again." });
        }
        return;
      }
      setScript(data.script);
      setFrequencyData(data.frequency || null);
      setSessionActive(true);
      qc.invalidateQueries({ queryKey: ["positivity-usage"] });
    } catch {
      toast({ title: "Connection issue", description: "Please try again in a moment." });
    } finally {
      setLoading(false);
      setLoadingCategory(null);
    }
  }

  // Full-screen session mode
  if (script) {
    return (
      <AnimatePresence>
        <PositivitySession
          script={script}
          frequencyHz={frequencyData?.hz}
          frequencyName={frequencyData?.name}
          onClose={() => {
            setScript(null);
            setFrequencyData(null);
            setIntention("");
            setSelectedCategory(null);
            setSessionActive(false);
          }}
        />
      </AnimatePresence>
    );
  }

  return (
    <ShellCard className="overflow-hidden">
      <div className="relative p-4 lum-glow-gold">
        {/* Animated aurora background */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(60% 50% at 30% 20%, rgba(197,168,124,0.10) 0%, transparent 70%), radial-gradient(40% 40% at 80% 80%, rgba(158,138,201,0.06) 0%, transparent 70%)",
          }}
          animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-gold to-gold/30" />
              <h3 className="text-[12px] uppercase tracking-[0.2em] text-gold font-medium">Positivity Generator</h3>
            </div>
            <div className="flex items-center gap-2">
              {/* Positivity streak badge */}
              {usageData?.positivityStreak && usageData.positivityStreak > 0 && (
                <span className="flex items-center gap-1 text-[9.5px] text-leaf/80 font-medium" style={{ color: "#B5CD7E" }}>
                  <Flame className="w-3 h-3" style={{ color: "#B5CD7E" }} />
                  {usageData.positivityStreak}d
                </span>
              )}
              {isLocked ? (
                <span className="flex items-center gap-1 text-[9.5px] text-ink-muted/60">
                  <Lock className="w-3 h-3" />
                  Limit reached
                </span>
              ) : !isPremium ? (
                <span className="text-[9.5px] text-ink-muted/60 tabular-nums">
                  {remaining ?? 1} free left
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[9.5px] text-gold/70">
                  <Sparkles className="w-3 h-3" />
                  Unlimited
                </span>
              )}
              <Sun className="w-4 h-4 text-gold/60" />
            </div>
          </div>

          <p className="text-[12px] text-ink-muted leading-[16px] mb-4 max-w-[300px]">
            Start your day with a 1-3 minute guided recitation. Tap a category for quick start, or type your intention below.
          </p>

          {/* Category chips — quick-start on tap */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {POSITIVITY_CATEGORIES.slice(0, 8).map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const isLoadingThis = loadingCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (isLocked) {
                      toast({
                        title: "Daily limit reached",
                        description: "Upgrade to Premium for unlimited positivity sessions.",
                      });
                      return;
                    }
                    // Quick-start: immediately generate if no intention text
                    if (!intention.trim()) {
                      startSession(cat.id, "");
                    } else {
                      setSelectedCategory(isSelected ? null : cat.id);
                    }
                  }}
                  disabled={loading}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10.5px] font-medium border transition-all ${
                    isSelected
                      ? "border-transparent"
                      : "border-white/8 bg-white/[0.02] text-ink-muted hover:text-ink hover:border-white/15"
                  } ${loading && !isLoadingThis ? "opacity-40" : ""}`}
                  style={isSelected ? {
                    background: `${cat.color}20`,
                    borderColor: `${cat.color}50`,
                    color: cat.color,
                  } : undefined}
                >
                  {isLoadingThis ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span className="text-[11px]">{cat.glyph}</span>
                  )}
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Intention input — optional */}
          <div className="relative mb-3">
            <textarea
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              placeholder="Or type your specific desire… (e.g., 'I want to attract financial abundance')"
              rows={2}
              maxLength={500}
              className="w-full bg-white/[0.03] border border-white/8 rounded-xl px-3 py-2.5 text-[13px] leading-[19px] text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-gold/30 resize-none transition-colors"
            />
            <div className="absolute bottom-2 right-2.5 text-[9px] text-ink-muted/50 tabular-nums">
              {intention.length}/500
            </div>
          </div>

          {/* Duration slider — 1 to 5 minutes */}
          <div className="mb-3 px-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-[0.15em] text-ink-muted/70 font-medium">Session Length</span>
              <span className="text-[11px] text-gold font-medium tabular-nums">{durationMin} min</span>
            </div>
            <div className="relative flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((m) => (
                <button
                  key={m}
                  onClick={() => setDurationMin(m)}
                  disabled={loading}
                  className={`flex-1 h-8 rounded-lg text-[11px] font-medium transition-all ${
                    durationMin === m
                      ? "bg-gold/20 border border-gold/40 text-gold"
                      : "bg-white/[0.02] border border-white/8 text-ink-muted/60 hover:text-ink hover:border-white/15"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          {/* Start button */}
          <GoldButton
            onClick={() => startSession()}
            disabled={loading || isLocked || (!selectedCategory && !intention.trim())}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating your script…
              </>
            ) : isLocked ? (
              <>
                <Lock className="w-4 h-4" />
                Upgrade for unlimited sessions
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Begin Positivity Session
              </>
            )}
          </GoldButton>

          {/* Quick suggestions — only when input is empty */}
          {!intention && !isLocked && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="text-[9.5px] text-ink-muted/60 uppercase tracking-[0.15em] w-full mb-0.5">Try:</span>
              {[
                "I am attracting wealth and abundance",
                "I release anxiety and find peace",
                "I am confident and powerful at work",
                "I am open to love and connection",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setIntention(s)}
                  className="text-[10.5px] text-gold/70 hover:text-gold border border-gold/15 hover:border-gold/30 rounded-full px-2.5 py-1 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </ShellCard>
  );
}
