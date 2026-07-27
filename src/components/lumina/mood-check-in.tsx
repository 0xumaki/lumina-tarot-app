"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useHaptics } from "@/hooks/use-haptics";
import { GlassCard } from "@/components/lumina/primitives";

const MOODS = [
  { value: 1, label: "Heavy", glyph: "🌑", color: "#7A8680" },
  { value: 2, label: "Low", glyph: "🌒", color: "#8AA8C9" },
  { value: 3, label: "Neutral", glyph: "🌓", color: "#C5A87C" },
  { value: 4, label: "Light", glyph: "🌔", color: "#B5CD7E" },
  { value: 5, label: "Bright", glyph: "🌕", color: "#E7D2A8" },
];

type MoodData = {
  today: { mood: number; note: string | null; date: string } | null;
  week: { date: string; mood: number | null; note: string | null }[];
};

export function MoodCheckIn() {
  const api = useApi();
  const qc = useQueryClient();
  const haptics = useHaptics();
  const [selected, setSelected] = React.useState<number | null>(null);
  const [showNote, setShowNote] = React.useState(false);
  const [note, setNote] = React.useState("");

  const { data } = useQuery<MoodData>({
    queryKey: ["mood"],
    queryFn: async () => (await api("/api/mood")).json(),
    refetchOnWindowFocus: true,
  });

  const saveMutation = useMutation({
    mutationFn: async (mood: number) =>
      (await api("/api/mood", {
        method: "POST",
        body: JSON.stringify({ mood, note: note.trim() || undefined }),
      })).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mood"] });
      haptics("complete");
    },
  });

  // Sync selected with today's mood
  React.useEffect(() => {
    if (data?.today && selected === null) {
      setSelected(data.today.mood);
      setNote(data.today.note || "");
    }
  }, [data, selected]);

  const logged = !!data?.today;

  function select(mood: number) {
    setSelected(mood);
    haptics("tap");
    if (!logged) {
      // Auto-save on first selection
      saveMutation.mutate(mood);
    }
  }

  function saveWithNote() {
    if (selected) {
      saveMutation.mutate(selected);
      setShowNote(false);
    }
  }

  const currentMood = selected ? MOODS.find((m) => m.value === selected) : null;

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-gold/80 font-medium">
            Daily mood
          </div>
          <div className="text-[14px] font-medium text-ink mt-0.5">
            {logged ? "How are you feeling?" : "How are you feeling today?"}
          </div>
        </div>
        {logged && (
          <span className="text-[10px] text-leaf flex items-center gap-1">
            <Check className="w-3 h-3" /> Logged
          </span>
        )}
      </div>

      {/* Mood selector */}
      <div className="flex items-center justify-between gap-1.5">
        {MOODS.map((m) => {
          const active = selected === m.value;
          return (
            <button
              key={m.value}
              onClick={() => select(m.value)}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all"
              style={{
                background: active ? `${m.color}1a` : "transparent",
                border: `1px solid ${active ? `${m.color}55` : "transparent"}`,
              }}
              aria-label={m.label}
            >
              <motion.span
                animate={active ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-[20px] leading-none"
                style={{ filter: active ? "none" : "grayscale(0.5) opacity(0.6)" }}
              >
                {m.glyph}
              </motion.span>
              <span
                className="text-[9px] font-medium tracking-wide"
                style={{ color: active ? m.color : "#7A8680" }}
              >
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Note input + save */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {showNote ? (
              <div className="pt-3 space-y-2">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What's behind this feeling? (optional)"
                  rows={2}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-[12px] leading-[17px] text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-gold/40 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveWithNote}
                    disabled={saveMutation.isPending}
                    className="flex-1 rounded-full py-2 text-[12px] font-medium bg-[#E8EBE9] text-[#050806] active:scale-[0.98] transition-all"
                  >
                    {saveMutation.isPending ? "Saving…" : "Save mood"}
                  </button>
                  <button
                    onClick={() => setShowNote(false)}
                    className="rounded-full px-4 py-2 text-[12px] text-ink-muted border border-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2.5 flex items-center justify-between">
                <span className="text-[11px] text-ink-muted">
                  {currentMood && (
                    <>
                      <span style={{ color: currentMood.color }}>●</span> {currentMood.label}
                      {note && <span className="ml-1.5 italic">— "{note.slice(0, 40)}{note.length > 40 ? "…" : ""}"</span>}
                    </>
                  )}
                </span>
                <button
                  onClick={() => setShowNote(true)}
                  className="text-[11px] text-gold/70 hover:text-gold transition-colors"
                >
                  {note ? "Edit note" : "Add note"}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
