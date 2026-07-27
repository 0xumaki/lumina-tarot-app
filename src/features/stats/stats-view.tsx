"use client";

import * as React from "react";
import { motion, type Variants } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Target,
  AudioLines,
  Flame,
  CheckCircle2,
  Activity,
  CalendarDays,
  AlertCircle,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import {
  GlassCard,
  ShellCard,
  SectionTitle,
  Divider,
} from "@/components/lumina/primitives";
import { useAppStore, type TabKey } from "@/lib/store";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type StatsData = {
  memberSince: string;
  readings: {
    total: number;
    thisWeek: number;
    mostUsedSpread: string | null;
    mostUsedSpreadKey: string | null;
  };
  goals: {
    total: number;
    active: number;
    achieved: number;
    totalConfirmations: number;
    bestStreak: number;
    bestStreakGoalTitle: string | null;
    confirmationsThisWeek: number[];
  };
  frequency: {
    totalSessions: number;
    totalSeconds: number;
    totalMinutes: number;
    mostUsedIntention: string | null;
    mostUsedIntentionKey: string | null;
    mostUsedIntentionHz: number | null;
    minutesThisWeek: number[];
  };
  activity: {
    date: string;
    readings: number;
    confirmations: number;
    frequencySec: number;
  }[];
  mood: {
    week: (number | null)[];
    average: number | null;
    daysLogged: number;
    correlation: {
      withReadings: number | null;
      withoutReadings: number | null;
    };
  };
  insight: {
    title: string;
    body: string;
    accent: string;
    glyph: string;
  };
};

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* ------------------------------------------------------------------ */

const GOLD = "#C5A87C";
const LEAF = "#B5CD7E";
const SAGE = "#7A8680";

/* ------------------------------------------------------------------ */
/* Motion variants                                                     */
/* ------------------------------------------------------------------ */

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
};

const gridVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: "easeOut" },
  },
};

/* ------------------------------------------------------------------ */
/* Count-up hook                                                       */
/* ------------------------------------------------------------------ */

/** Animate a number from its previous value to `target` over `duration` ms. */
function useCountUp(target: number, duration = 900): number {
  const [val, setVal] = React.useState(0);
  const prev = React.useRef(0);

  React.useEffect(() => {
    if (target <= 0) {
      setVal(0);
      prev.current = 0;
      return;
    }
    let raf = 0;
    const start = performance.now();
    const from = prev.current;
    const delta = target - from;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + delta * eased);
      setVal(next);
      prev.current = next;
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return val;
}

/* ------------------------------------------------------------------ */
/* Stat tile                                                           */
/* ------------------------------------------------------------------ */

function StatTile({
  icon: Icon,
  value,
  label,
  accent,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  accent: string;
}) {
  const animated = useCountUp(value);
  return (
    <GlassCard className="p-4 h-full">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: `${accent}1a`, border: `1px solid ${accent}33` }}
      >
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
      <div className="mt-3 text-[28px] leading-none font-light text-ink tabular-nums">
        {animated}
      </div>
      <div className="mt-1.5 text-[12px] text-ink-muted leading-[15px]">
        {label}
      </div>
    </GlassCard>
  );
}

/* ------------------------------------------------------------------ */
/* 7-day activity chart (custom SVG)                                   */
/* ------------------------------------------------------------------ */

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ActivityChart({ data }: { data: StatsData["activity"] }) {
  // Normalise each metric to its own max so all three stay visible even
  // though readings/confirmations are small counts and frequency is minutes.
  const maxReadings = Math.max(1, ...data.map((d) => d.readings));
  const maxConf = Math.max(1, ...data.map((d) => d.confirmations));
  const maxFreqMin = Math.max(
    1,
    ...data.map((d) => Math.round(d.frequencySec / 60))
  );

  const W = 700;
  const H = 200;
  const padTop = 6;
  const chartH = H - padTop;
  const colW = W / 7;
  const barW = 16;
  const gap = 5;
  const groupW = barW * 3 + gap * 2;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height={120}
        className="block"
        role="img"
        aria-label="7-day activity chart"
      >
        {/* baseline */}
        <line
          x1={0}
          x2={W}
          y1={H}
          y2={H}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {data.map((d, i) => {
          const cx = colW * i + colW / 2;
          const rH = (d.readings / maxReadings) * chartH;
          const cH = (d.confirmations / maxConf) * chartH;
          const fMin = Math.round(d.frequencySec / 60);
          const fH = (fMin / maxFreqMin) * chartH;
          const startX = cx - groupW / 2;
          const baseY = H;
          return (
            <g key={d.date}>
              {/* readings — gold */}
              <rect
                x={startX}
                y={baseY - rH}
                width={barW}
                height={rH}
                rx={2}
                fill={GOLD}
                opacity={d.readings > 0 ? 1 : 0.14}
              />
              {/* confirmations — leaf */}
              <rect
                x={startX + barW + gap}
                y={baseY - cH}
                width={barW}
                height={cH}
                rx={2}
                fill={LEAF}
                opacity={d.confirmations > 0 ? 1 : 0.14}
              />
              {/* frequency minutes — sage */}
              <rect
                x={startX + (barW + gap) * 2}
                y={baseY - fH}
                width={barW}
                height={fH}
                rx={2}
                fill={SAGE}
                opacity={fMin > 0 ? 0.7 : 0.12}
              />
            </g>
          );
        })}
      </svg>

      {/* Day labels (HTML, to avoid SVG distortion) */}
      <div className="grid grid-cols-7 mt-1.5">
        {data.map((d) => {
          const day = new Date(d.date + "T00:00:00").getDay();
          return (
            <div
              key={d.date}
              className="text-center text-[10px] text-ink-muted font-medium"
            >
              {DAY_LABELS[day]}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <Legend color={GOLD} label="Readings" />
        <Legend color={LEAF} label="Confirmations" />
        <Legend color={SAGE} label="Frequency min" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-2 h-2 rounded-sm"
        style={{ background: color }}
        aria-hidden
      />
      <span className="text-[10px] text-ink-muted">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mood sparkline + helpers                                            */
/* ------------------------------------------------------------------ */

const MOOD_GLYPHS = ["🌑", "🌒", "🌓", "🌔", "🌕"];
const MOOD_COLORS = ["#7A8680", "#8AA8C9", "#C5A87C", "#B5CD7E", "#E7D2A8"];
const MOOD_LABELS = ["Heavy", "Low", "Neutral", "Light", "Bright"];

function moodLabel(avg: number | null): string {
  if (avg === null) return "—";
  const idx = Math.min(4, Math.max(0, Math.round(avg) - 1));
  return MOOD_LABELS[idx];
}

function MoodSparkline({ week }: { week: (number | null)[] }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-1.5 h-[60px]">
        {week.map((m, i) => {
          const hasMood = m !== null;
          const idx = hasMood ? Math.min(4, Math.max(0, m! - 1)) : 0;
          const height = hasMood ? 20 + idx * 10 : 6;
          const color = hasMood ? MOOD_COLORS[idx] : "rgba(255,255,255,0.06)";
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex-1 flex items-end w-full justify-center">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height }}
                  transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
                  className="w-full max-w-[28px] rounded-full"
                  style={{
                    height,
                    background: hasMood ? `${color}` : color,
                    opacity: hasMood ? 1 : 0.5,
                    boxShadow: hasMood ? `0 0 8px ${color}44` : "none",
                  }}
                />
              </div>
              <span className="text-[12px] leading-none" style={{ opacity: hasMood ? 1 : 0.3 }}>
                {hasMood ? MOOD_GLYPHS[idx] : "·"}
              </span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7 mt-1.5">
        {week.map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return (
            <div key={i} className="text-center text-[9px] text-ink-muted font-medium">
              {["S", "M", "T", "W", "T", "F", "S"][d.getDay()]}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Breakdown row                                                       */
/* ------------------------------------------------------------------ */

function BreakdownRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[12px] text-ink-muted">{label}</span>
      <span
        className="text-[13px] font-medium text-ink tabular-nums text-right"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading + error states                                              */
/* ------------------------------------------------------------------ */

function StatsLoading() {
  return (
    <div className="space-y-5">
      <div>
        <div className="h-3 w-24 bg-white/5 rounded mb-2 animate-pulse" />
        <div className="h-6 w-40 bg-white/5 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="lum-glass rounded-2xl p-4 h-[112px]">
            <div className="w-9 h-9 rounded-full bg-white/5 animate-pulse" />
            <div className="mt-3 h-7 w-12 bg-white/5 rounded animate-pulse" />
            <div className="mt-2 h-3 w-20 bg-white/5 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="lum-glass rounded-2xl p-4 h-48 animate-pulse" />
      <div className="lum-glass rounded-2xl p-4 h-32 animate-pulse" />
      <div className="lum-glass rounded-2xl p-4 h-32 animate-pulse" />
    </div>
  );
}

function StatsError() {
  return (
    <ShellCard className="p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-gold" />
        </div>
        <div>
          <div className="text-[15px] font-medium text-ink">
            Couldn&apos;t load your stats
          </div>
          <p className="text-[12px] text-ink-muted mt-1 max-w-[260px] mx-auto leading-[16px]">
            Your journey data will appear here once the connection settles.
          </p>
        </div>
      </div>
    </ShellCard>
  );
}

/** Friendly empty-state for first-time users — replaces the "all zeros" dashboard. */
function StatsEmpty({ memberSinceStr }: { memberSinceStr: string }) {
  const setTab = useAppStore((s) => s.setTab);
  const steps = [
    { icon: Sparkles, title: "Draw your first card", desc: "Ask the cards a question to begin your reading history.", tab: "tarot" as const, accent: GOLD },
    { icon: Target, title: "Set a manifestation goal", desc: "Name what you desire and confirm it daily to build a streak.", tab: "manifest" as const, accent: LEAF },
    { icon: AudioLines, title: "Tune into a frequency", desc: "Resonate with an intention tone to log your first session.", tab: "frequency" as const, accent: SAGE },
  ];
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      <motion.div variants={itemVariants}>
        <ShellCard className="overflow-hidden">
          <div className="relative p-6 lum-glow-gold text-center">
            <div className="relative z-10 flex flex-col items-center">
              <motion.div
                className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E7D2A8] to-[#9c7f54] flex items-center justify-center shadow-[0_0_40px_rgba(197,168,124,0.4)]"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="w-7 h-7 text-black" />
              </motion.div>
              <div className="mt-4 text-[11px] uppercase tracking-[0.2em] text-gold/80 font-medium">
                {memberSinceStr ? `Member since ${memberSinceStr}` : "Welcome"}
              </div>
              <h2 className="mt-1 text-[22px] font-light tracking-[-0.02em] text-ink">
                Your journey <span className="lum-text-gold">begins here</span>
              </h2>
              <p className="mt-2 text-[13px] text-ink-muted max-w-[280px] leading-[19px]">
                Your stats, streaks, and rhythms will bloom here as you read, manifest, and resonate. Begin with one of these:
              </p>
            </div>
          </div>
        </ShellCard>
      </motion.div>

      <motion.div variants={gridVariants} className="space-y-2.5">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <motion.button key={s.tab} variants={itemVariants} onClick={() => setTab(s.tab)} className="block w-full text-left">
              <GlassCard className="p-3.5 flex items-center gap-3 hover:border-white/15 transition-colors">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${s.accent}1a`, border: `1px solid ${s.accent}40` }}
                >
                  <Icon className="w-4 h-4" style={{ color: s.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-ink">{s.title}</div>
                  <div className="text-[11px] text-ink-muted leading-[15px] mt-0.5">{s.desc}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted" />
              </GlassCard>
            </motion.button>
          );
        })}
      </motion.div>

      <motion.div variants={itemVariants}>
        <GlassCard className="p-4">
          <div className="flex items-start gap-2.5">
            <Flame className="w-3.5 h-3.5 text-leaf mt-0.5 shrink-0" />
            <p className="text-[11px] leading-[16px] text-ink-muted">
              <span className="text-ink font-medium">Streaks unlock rewards.</span> Confirm a goal 3 days in a row to unlock the Daily Reflection spread, and 7 days for a signature insight into your reading style.
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Today's energy — card-of-day snippet                               */
/* ------------------------------------------------------------------ */

function TodaysEnergy() {
  const api = useApi();
  const { data } = useQuery({
    queryKey: ["card-of-day"],
    queryFn: async () => (await api("/api/tarot/card-of-day")).json(),
    staleTime: 60000,
  });

  if (!data?.card) {
    return (
      <GlassCard className="p-3.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 animate-pulse">
          <Sparkles className="w-4 h-4 text-gold/50" />
        </div>
        <div className="flex-1">
          <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
          <div className="h-2.5 w-40 bg-white/5 rounded mt-1.5 animate-pulse" />
        </div>
      </GlassCard>
    );
  }

  const card = data.card;
  const reversed = data.reversed;

  return (
    <GlassCard className="p-3.5 flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[18px]"
        style={{
          background: "radial-gradient(circle at 50% 40%, rgba(197,168,124,0.25), transparent 70%)",
          border: "1px solid rgba(197,168,124,0.35)",
          color: "#C5A87C",
        }}
      >
        {card.symbol}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.18em] text-gold/80 font-medium">
          Today's energy
        </div>
        <div className="text-[13px] font-medium text-ink mt-0.5 leading-[16px]">
          {card.nameShort}
          {reversed && <span className="text-gold/60 font-normal"> · Reversed</span>}
        </div>
        <div className="text-[11px] text-ink-muted line-clamp-1 mt-0.5">
          {(reversed ? card.keywordsReversed : card.keywordsUpright).slice(0, 3).join(" · ")}
        </div>
      </div>
    </GlassCard>
  );
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export default function StatsView() {
  const api = useApi();

  const { data, isLoading, isError } = useQuery<StatsData>({
    queryKey: ["stats"],
    queryFn: async () => (await api("/api/stats")).json(),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const memberSince = data ? new Date(data.memberSince) : null;
  const memberSinceStr = memberSince
    ? memberSince.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  if (isLoading) return <StatsLoading />;
  if (isError || !data) return <StatsError />;

  const minutesThisWeekTotal = data.frequency.minutesThisWeek.reduce(
    (a, b) => a + b,
    0
  );

  // Detect empty state: no readings, no confirmations, no frequency sessions
  const isEmpty =
    data.readings.total === 0 &&
    data.goals.totalConfirmations === 0 &&
    data.frequency.totalSessions === 0;

  if (isEmpty) return <StatsEmpty memberSinceStr={memberSinceStr} />;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <SectionTitle
          eyebrow="Your journey"
          title={
            <>
              Your <span className="lum-text-gold">journey</span>
            </>
          }
          subtitle={
            memberSince ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="w-3 h-3" /> Member since{" "}
                {memberSinceStr}
              </span>
            ) : undefined
          }
        />
      </motion.div>

      {/* Today's energy — card-of-day snippet */}
      <motion.div variants={itemVariants}>
        <TodaysEnergy />
      </motion.div>

      {/* Energy Insight — AI-style narrative summary */}
      <motion.div variants={itemVariants}>
        <ShellCard className="overflow-hidden">
          <div className="relative p-4" style={{ background: `linear-gradient(135deg, ${data.insight.accent}14 0%, transparent 70%)` }}>
            <div className="flex items-start gap-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-[20px]"
                style={{
                  background: `radial-gradient(circle at 50% 40%, ${data.insight.accent}33, transparent 70%)`,
                  border: `1px solid ${data.insight.accent}44`,
                  color: data.insight.accent,
                }}
              >
                {data.insight.glyph}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] font-medium" style={{ color: data.insight.accent }}>
                  Your energy signature
                </div>
                <div className="text-[16px] font-medium text-ink mt-0.5 leading-[20px]">
                  {data.insight.title}
                </div>
                <p className="text-[12px] leading-[18px] text-ink-muted mt-1.5">
                  {data.insight.body}
                </p>
              </div>
            </div>
          </div>
        </ShellCard>
      </motion.div>

      {/* Mood trend — inline sparkline under the signature (Option C) */}
      {data.mood.daysLogged > 0 && (
        <motion.div variants={itemVariants}>
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-gold/80 font-medium">
                  This week's tone
                </div>
                <div className="text-[13px] font-medium text-ink mt-0.5">
                  {moodLabel(data.mood.average)} · avg {data.mood.average?.toFixed(1)}/5
                </div>
              </div>
              <div className="text-[10px] text-ink-muted">
                {data.mood.daysLogged}/7 days
              </div>
            </div>
            <MoodSparkline week={data.mood.week} />
          </GlassCard>
        </motion.div>
      )}

      {/* Summary tiles (2×2) */}
      <motion.div
        variants={gridVariants}
        className="grid grid-cols-2 gap-3"
      >
        <motion.div variants={itemVariants}>
          <StatTile
            icon={Sparkles}
            value={data.readings.total}
            label="Total readings"
            accent={GOLD}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatTile
            icon={CheckCircle2}
            value={data.goals.totalConfirmations}
            label="Confirmations"
            accent={LEAF}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatTile
            icon={AudioLines}
            value={data.frequency.totalMinutes}
            label="Frequency minutes"
            accent={SAGE}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatTile
            icon={Flame}
            value={data.goals.bestStreak}
            label="Best streak (days)"
            accent={GOLD}
          />
        </motion.div>
      </motion.div>

      {/* 7-day activity chart */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-gold/80 font-medium">
                Last 7 days
              </div>
              <div className="text-[15px] font-medium text-ink mt-0.5">
                Activity rhythm
              </div>
            </div>
            <Activity className="w-4 h-4 text-ink-muted" />
          </div>
          <ActivityChart data={data.activity} />
        </GlassCard>
      </motion.div>

      {/* Tarot breakdown */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
            </div>
            <div className="text-[14px] font-medium text-ink">Tarot</div>
          </div>
          <Divider className="my-1" />
          <BreakdownRow
            label="Most used spread"
            value={data.readings.mostUsedSpread ?? "—"}
            accent={GOLD}
          />
          <BreakdownRow
            label="Readings this week"
            value={data.readings.thisWeek}
          />
          <BreakdownRow label="Total readings" value={data.readings.total} />
        </GlassCard>
      </motion.div>

      {/* Manifestation breakdown */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-leaf/10 border border-leaf/20 flex items-center justify-center">
              <Target className="w-3.5 h-3.5 text-leaf" />
            </div>
            <div className="text-[14px] font-medium text-ink">
              Manifestation
            </div>
          </div>
          <Divider className="my-1" />
          <BreakdownRow label="Active goals" value={data.goals.active} accent={LEAF} />
          <BreakdownRow label="Achieved goals" value={data.goals.achieved} />
          <BreakdownRow
            label="Total confirmations"
            value={data.goals.totalConfirmations}
          />
          <BreakdownRow
            label="Best streak"
            value={
              <span>
                {data.goals.bestStreak}d
                {data.goals.bestStreakGoalTitle ? (
                  <span className="text-ink-muted text-[11px] ml-1.5 font-normal">
                    · {data.goals.bestStreakGoalTitle}
                  </span>
                ) : null}
              </span>
            }
            accent={GOLD}
          />
        </GlassCard>
      </motion.div>

      {/* Frequency breakdown */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-sage/10 border border-sage/20 flex items-center justify-center">
              <AudioLines className="w-3.5 h-3.5" style={{ color: SAGE }} />
            </div>
            <div className="text-[14px] font-medium text-ink">Frequency</div>
          </div>
          <Divider className="my-1" />
          <BreakdownRow
            label="Most used intention"
            value={
              data.frequency.mostUsedIntention ? (
                <span>
                  {data.frequency.mostUsedIntention}
                  {data.frequency.mostUsedIntentionHz ? (
                    <span className="text-ink-muted text-[11px] ml-1.5 font-normal">
                      · {data.frequency.mostUsedIntentionHz} Hz
                    </span>
                  ) : null}
                </span>
              ) : (
                "—"
              )
            }
            accent={SAGE}
          />
          <BreakdownRow
            label="Total sessions"
            value={data.frequency.totalSessions}
          />
          <BreakdownRow
            label="Minutes this week"
            value={minutesThisWeekTotal}
          />
        </GlassCard>
      </motion.div>

      {/* Mood-reading correlation insight */}
      {data.mood.daysLogged >= 2 &&
        data.mood.correlation.withReadings !== null &&
        data.mood.correlation.withoutReadings !== null && (
          <motion.div variants={itemVariants}>
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-gold" />
                </div>
                <div className="text-[14px] font-medium text-ink">Pattern</div>
              </div>
              <Divider className="my-1" />
              <p className="text-[12px] leading-[18px] text-ink-muted py-2">
                {buildMoodInsight(
                  data.mood.correlation.withReadings,
                  data.mood.correlation.withoutReadings
                )}
              </p>
            </GlassCard>
          </motion.div>
        )}
    </motion.div>
  );
}

function buildMoodInsight(withReadings: number, withoutReadings: number): string {
  const diff = Math.round((withReadings - withoutReadings) * 10) / 10;
  if (Math.abs(diff) < 0.3) {
    return `Your mood stays steady (avg ${withReadings.toFixed(1)}/5) whether or not you read the cards — the ritual is a companion, not a crutch.`;
  }
  if (diff > 0) {
    return `On days you read the cards, your mood averages ${withReadings.toFixed(1)}/5 — ${diff.toFixed(1)} points brighter than days without (${withoutReadings.toFixed(1)}/5). The cards lift you.`;
  }
  return `On days you read the cards, your mood averages ${withReadings.toFixed(1)}/5 — ${Math.abs(diff).toFixed(1)} points lower than days without (${withoutReadings.toFixed(1)}/5). You may be seeking the cards when you need them most.`;
}
