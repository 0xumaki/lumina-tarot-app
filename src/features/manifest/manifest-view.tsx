"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Target, Plus, Flame, Clock, Check, X, Lock, Bell, Sparkles, AudioLines, ChevronRight, Trash2,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { useSound } from "@/hooks/use-sound";
import { GlassCard, ShellCard, GoldButton, GhostButton, Pill, SectionTitle, Divider } from "@/components/lumina/primitives";
import { MilestoneCelebration, isMilestone } from "@/components/lumina/milestone-celebration";
import { getPreset, type IntentionKey } from "@/lib/frequencies";
import { useAppStore } from "@/lib/store";
import { PremiumModal } from "@/features/premium/premium-modal";

type Goal = {
  id: string;
  title: string;
  intention: string;
  statement: string;
  reminderTime: string;
  targetDate: string | null;
  frequencyHz: number | null;
  status: string;
  createdAt: string;
  confirmedToday: boolean;
  streak: number;
  totalConfirmations: number;
};

export function ManifestView({ isPremium }: { isPremium: boolean }) {
  const api = useApi();
  const { toast } = useToast();
  const qc = useQueryClient();
  const setTab = useAppStore((s) => s.setTab);
  const setPending = useAppStore((s) => s.setPendingPremiumAction);
  const [premiumOpen, setPremiumOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [milestoneStreak, setMilestoneStreak] = React.useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const r = await api("/api/manifest/goals");
      return r.json();
    },
  });
  const goals: Goal[] = data?.goals || [];

  const sound = useSound();

  const confirmMutation = useMutation({
    mutationFn: async (goalId: string) =>
      (await api("/api/manifest/confirm", { method: "POST", body: JSON.stringify({ goalId }) })).json(),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      sound("bell");
      // Check for milestone celebration
      if (res?.streak && isMilestone(res.streak)) {
        setMilestoneStreak(res.streak);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (goalId: string) =>
      (await api(`/api/manifest/goals?id=${goalId}`, { method: "DELETE" })).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast({ title: "Goal archived" });
    },
  });

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Manifestation"
        title={<>Shape your <span className="lum-text-gold">desire</span></>}
        subtitle={
          isPremium
            ? "Unlimited goals. Confirm each daily to compound the signal."
            : "One active goal on the free tier. Confirm it daily to build the streak."
        }
      />

      {goals.length === 0 && !isLoading ? (
        <ShellCard className="p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-gold" />
            </div>
            <div>
              <div className="text-[15px] font-medium text-ink">No active goal yet</div>
              <p className="text-[12px] text-ink-muted mt-1 max-w-[260px] mx-auto leading-[16px]">
                Name what you desire. Lumina will suggest a frequency and a daily confirmation time.
              </p>
            </div>
            <GoldButton onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4" />
              Set Your First Goal
            </GoldButton>
          </div>
        </ShellCard>
      ) : (
        <>
          <div className="space-y-3">
            <AnimatePresence>
              {goals.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  onConfirm={() => confirmMutation.mutate(g.id)}
                  confirming={confirmMutation.isPending}
                  onDelete={() => deleteMutation.mutate(g.id)}
                  onPlayFreq={() => setTab("frequency")}
                />
              ))}
            </AnimatePresence>
          </div>
          <GoldButton
            onClick={() => {
              if (!isPremium && goals.filter((g) => g.status === "active").length >= 1) {
                setPending("Free tier supports one active goal. Upgrade for unlimited goals.");
                setPremiumOpen(true);
                return;
              }
              setCreating(true);
            }}
            className="w-full"
          >
            <Plus className="w-4 h-4" />
            New Goal
          </GoldButton>
        </>
      )}

      <CreateGoalSheet open={creating} onOpenChange={setCreating} />

      <DailyRitualInfo />

      <PremiumModal open={premiumOpen} onOpenChange={setPremiumOpen} />
      <MilestoneCelebration
        streak={milestoneStreak ?? 0}
        open={milestoneStreak !== null}
        onClose={() => setMilestoneStreak(null)}
      />
    </div>
  );
}

function GoalCard({
  goal,
  onConfirm,
  confirming,
  onDelete,
  onPlayFreq,
}: {
  goal: Goal;
  onConfirm: () => void;
  confirming: boolean;
  onDelete: () => void;
  onPlayFreq: () => void;
}) {
  const preset = getPreset(goal.intention as IntentionKey);
  const achieved = goal.status === "achieved";
  const [open, setOpen] = React.useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
    >
      <ShellCard className="overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Pill variant="gold">
                  <span style={{ color: preset.color }}>{preset.glyph}Hz</span>
                </Pill>
                {goal.streak > 0 && (
                  <Pill variant="leaf">
                    <Flame className="w-3 h-3" />
                    {goal.streak}d
                  </Pill>
                )}
                {achieved && <Pill variant="leaf"><Check className="w-3 h-3" />Achieved</Pill>}
              </div>
              <h3 className="text-[16px] font-medium text-ink leading-[20px]">{goal.title}</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOpen((o) => !o)}
                className="text-ink-muted hover:text-ink p-1"
                aria-label="Toggle details"
              >
                <ChevronRight className={`w-4 h-4 transition-transform ${open ? "rotate-90" : ""}`} />
              </button>
            </div>
          </div>

          <p className="mt-2 text-[13px] leading-[19px] text-ink-muted italic">"{goal.statement}"</p>

          <div className="mt-3 flex items-center gap-3 text-[11px] text-ink-muted">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {goal.reminderTime}
            </span>
            <span className="flex items-center gap-1">
              <Bell className="w-3 h-3" />
              {goal.totalConfirmations} confirmations
            </span>
          </div>

          {/* Visual streak progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-[0.14em] text-ink-muted font-medium">
                {goal.streak >= 7 ? "Flame lit" : goal.streak >= 3 ? "Building" : "Begin"}
              </span>
              <span className="text-[10px] text-ink-muted tabular-nums">
                {goal.streak}/7d
              </span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 7 }).map((_, i) => {
                const filled = i < Math.min(goal.streak, 7);
                const isToday = goal.streak === i && !goal.confirmedToday;
                return (
                  <div
                    key={i}
                    className="h-1.5 flex-1 rounded-full transition-all"
                    style={{
                      background: filled
                        ? goal.streak >= 7
                          ? "linear-gradient(90deg, #E89A4A, #C5A87C)"
                          : goal.streak >= 3
                            ? "#B5CD7E"
                            : "#7A8680"
                        : isToday
                          ? "rgba(197,168,124,0.3)"
                          : "rgba(255,255,255,0.06)",
                      boxShadow: filled && goal.streak >= 7 ? "0 0 6px rgba(232,154,74,0.5)" : "none",
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <GoldButton
              onClick={onConfirm}
              disabled={confirming || goal.confirmedToday || achieved}
              className="flex-1"
            >
              {goal.confirmedToday ? (
                <>
                  <Check className="w-4 h-4" /> Confirmed today
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Confirm now
                </>
              )}
            </GoldButton>
            <GhostButton onClick={onPlayFreq} className="px-3">
              <AudioLines className="w-4 h-4 text-gold" />
            </GhostButton>
          </div>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Divider className="my-3" />
                <div className="space-y-2 text-[12px]">
                  <Row label="Intention" value={preset.label} />
                  <Row label="Frequency" value={`${preset.carrierHz} Hz · ${preset.beatType}`} />
                  <Row label="Affirmation" value={preset.affirmation} />
                  <Row label="Created" value={new Date(goal.createdAt).toLocaleDateString()} />
                </div>
                <button
                  onClick={onDelete}
                  className="mt-3 flex items-center gap-1.5 text-[11px] text-destructive/70 hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" /> Archive goal
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ShellCard>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-ink-muted w-20 shrink-0">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

function CreateGoalSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const api = useApi();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [title, setTitle] = React.useState("");
  const [statement, setStatement] = React.useState("");
  const [time, setTime] = React.useState("09:00");
  const [target, setTarget] = React.useState("");
  const [detected, setDetected] = React.useState<ReturnType<typeof getPreset> | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (title.trim() || statement.trim()) {
      import("@/lib/frequencies").then(({ detectIntention }) => {
        setDetected(detectIntention(`${title} ${statement}`));
      });
    } else {
      setDetected(null);
    }
  }, [title, statement]);

  async function save() {
    if (!title.trim() || !statement.trim()) {
      toast({ title: "Title and statement are required" });
      return;
    }
    setSaving(true);
    try {
      const res = await api("/api/manifest/goals", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          statement: statement.trim(),
          reminderTime: time,
          targetDate: target || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Could not create", description: data.message || data.error });
        return;
      }
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast({ title: "Goal set", description: `Tuned to ${detected?.carrierHz}Hz · ${detected?.label}` });
      setTitle(""); setStatement(""); setTarget("");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => onOpenChange(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="relative w-full max-w-md m-3 lum-glass-float rounded-t-[28px] sm:rounded-[28px] max-h-[88vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/8">
              <h3 className="text-[15px] font-medium text-ink flex items-center gap-2">
                <Target className="w-4 h-4 text-gold" /> New Goal
              </h3>
              <button onClick={() => onOpenChange(false)} className="text-ink-muted hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4 lum-no-scrollbar">
              <Field label="Title">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Financial abundance"
                  className="lum-input"
                />
              </Field>
              <Field label="Your statement (present tense, as if now)">
                <textarea
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  placeholder="I am receiving wealth with ease and gratitude."
                  rows={3}
                  className="lum-input resize-none"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Daily reminder">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="lum-input"
                  />
                </Field>
                <Field label="Target date (optional)">
                  <input
                    type="date"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="lum-input"
                  />
                </Field>
              </div>

              {detected && (
                <div className="rounded-xl border border-gold/20 bg-gold/[0.05] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AudioLines className="w-3.5 h-3.5 text-gold" />
                    <span className="text-[11px] uppercase tracking-[0.16em] text-gold/80 font-medium">
                      Auto-tuned
                    </span>
                  </div>
                  <div className="text-[13px] text-ink">
                    {detected.label} · <span style={{ color: detected.color }}>{detected.carrierHz} Hz</span>
                  </div>
                  <p className="text-[11px] text-ink-muted mt-1 leading-[15px]">{detected.description}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/8 space-y-2">
              <GoldButton onClick={save} disabled={saving} className="w-full">
                {saving ? "Setting…" : "Set the intention"}
              </GoldButton>
            </div>
          </motion.div>
          <style>{`.lum-input{width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:10px 12px;font-size:14px;color:#E8EBE9;outline:none;transition:border .15s}.lum-input:focus{border-color:rgba(197,168,124,0.5)}.lum-input::placeholder{color:rgba(122,134,128,0.6)}`}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-[0.16em] text-ink-muted font-medium block mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function DailyRitualInfo() {
  const [open, setOpen] = React.useState(false);
  return (
    <GlassCard className="overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-full bg-leaf/10 border border-leaf/20 flex items-center justify-center shrink-0">
          <Flame className="w-4 h-4 text-leaf" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-ink">The daily ritual</div>
          <div className="text-[11px] text-ink-muted mt-0.5">
            How confirmation compounds the signal
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-ink-muted transition-transform shrink-0 ${open ? "rotate-90" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-2.5">
              <Divider />
              <div className="space-y-2 pt-1">
                {[
                  { step: "1", title: "Set your statement", desc: "Write your desire in the present tense, as if it already is." },
                  { step: "2", title: "Confirm daily", desc: "At your chosen time, speak the statement aloud with feeling." },
                  { step: "3", title: "Tune the frequency", desc: "Resonate with the auto-tuned tone while you confirm to deepen the signal." },
                  { step: "4", title: "Build the streak", desc: "Each consecutive day compounds. 3 days unlocks reflection; 7 lights the flame." },
                ].map((s) => (
                  <div key={s.step} className="flex gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-leaf/15 border border-leaf/30 flex items-center justify-center shrink-0 text-[10px] font-medium text-leaf">
                      {s.step}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-ink">{s.title}</div>
                      <div className="text-[11px] text-ink-muted leading-[15px] mt-0.5">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
