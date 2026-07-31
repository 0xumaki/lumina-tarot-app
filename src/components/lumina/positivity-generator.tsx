"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Sparkles, Loader2, X } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { GlassCard, ShellCard, GoldButton, GhostButton } from "@/components/lumina/primitives";
import { POSITIVITY_CATEGORIES, type PositivityCategory, type PositivityScript } from "@/lib/positivity";
import { PositivitySession } from "./positivity-session";

/**
 * PositivityGenerator — the home page entry point for the positivity feature.
 *
 * Two states:
 * 1. Idle: A beautiful card with category chips + intention input
 * 2. Session: Full-screen immersive recitation experience (PositivitySession)
 */
export function PositivityGenerator() {
  const api = useApi();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = React.useState<PositivityCategory | null>(null);
  const [intention, setIntention] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [script, setScript] = React.useState<PositivityScript | null>(null);

  async function startSession() {
    if (!intention.trim()) {
      toast({ title: "Share your intention", description: "What would you like to generate positivity for?" });
      return;
    }
    setLoading(true);
    try {
      const res = await api("/api/positivity", {
        method: "POST",
        body: JSON.stringify({
          category: selectedCategory,
          intention: intention.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Could not generate", description: data.error || "Please try again." });
        return;
      }
      setScript(data.script);
    } catch {
      toast({ title: "Connection issue", description: "Please try again in a moment." });
    } finally {
      setLoading(false);
    }
  }

  // Full-screen session mode
  if (script) {
    return (
      <AnimatePresence>
        <PositivitySession script={script} onClose={() => { setScript(null); setIntention(""); setSelectedCategory(null); }} />
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
            <Sun className="w-4 h-4 text-gold/60" />
          </div>

          <p className="text-[12px] text-ink-muted leading-[16px] mb-4 max-w-[300px]">
            Start your day with a 1-3 minute guided recitation. Choose your intention, breathe, and let positivity flow.
          </p>

          {/* Category chips */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {POSITIVITY_CATEGORIES.slice(0, 8).map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10.5px] font-medium border transition-all ${
                    isSelected
                      ? "border-transparent"
                      : "border-white/8 bg-white/[0.02] text-ink-muted hover:text-ink hover:border-white/15"
                  }`}
                  style={isSelected ? {
                    background: `${cat.color}20`,
                    borderColor: `${cat.color}50`,
                    color: cat.color,
                  } : undefined}
                >
                  <span className="text-[11px]">{cat.glyph}</span>
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Intention input */}
          <div className="relative mb-3">
            <textarea
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              placeholder="What would you like to generate positivity for? (e.g., 'I want to attract financial abundance' or 'I need to release work stress')"
              rows={2}
              maxLength={500}
              className="w-full bg-white/[0.03] border border-white/8 rounded-xl px-3 py-2.5 text-[13px] leading-[19px] text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-gold/30 resize-none transition-colors"
            />
            <div className="absolute bottom-2 right-2.5 text-[9px] text-ink-muted/50 tabular-nums">
              {intention.length}/500
            </div>
          </div>

          {/* Start button */}
          <GoldButton
            onClick={startSession}
            disabled={loading || !intention.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating your script…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Begin Positivity Session
              </>
            )}
          </GoldButton>

          {/* Quick suggestions */}
          {!intention && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="text-[9.5px] text-ink-muted/60 uppercase tracking-[0.15em] w-full mb-1">Try:</span>
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
