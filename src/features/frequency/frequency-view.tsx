"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AudioLines, Play, Pause, Lock, Activity, Waves, Brain, Sparkles, RotateCcw, Info, Wind,
  CloudRain, Trees, Droplets, Mountain, Music,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { GlassCard, ShellCard, GoldButton, GhostButton, Pill, SectionTitle, Divider } from "@/components/lumina/primitives";
import {
  FREQUENCY_PRESETS, BRAINWAVE_LABELS, type FrequencyPreset, type BrainwaveType, getPreset,
} from "@/lib/frequencies";
import { useAppStore } from "@/lib/store";
import { PremiumModal } from "@/features/premium/premium-modal";
import { useFrequencyEngine, type AmbientBed } from "./audio-engine";
import { BreathingPacer } from "./breathing-pacer";

const AMBEDIENT_BEDS: { id: AmbientBed; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "ambient", label: "Ambient", icon: Music, desc: "Warm evolving drone" },
  { id: "rain", label: "Rain", icon: CloudRain, desc: "Gentle rainfall" },
  { id: "ocean", label: "Ocean", icon: Waves, desc: "Rolling waves" },
  { id: "wind", label: "Wind", icon: Wind, desc: "Soft breeze" },
  { id: "birds", label: "Birds", icon: Trees, desc: "Melodic bird songs" },
  { id: "stream", label: "Stream", icon: Droplets, desc: "Bubbling brook" },
  { id: "river", label: "River", icon: Mountain, desc: "Flowing river with depth" },
  { id: "none", label: "None", icon: AudioLines, desc: "Pure tone only" },
];

export function FrequencyView({ isPremium }: { isPremium: boolean }) {
  const api = useApi();
  const { toast } = useToast();
  const qc = useQueryClient();
  const setPending = useAppStore((s) => s.setPendingPremiumAction);
  const [premiumOpen, setPremiumOpen] = React.useState(false);

  const [selected, setSelected] = React.useState<FrequencyPreset>(FREQUENCY_PRESETS[0]);
  const [mode, setMode] = React.useState<"pure" | "binaural" | "pad">("binaural");
  const [ambient, setAmbient] = React.useState<AmbientBed>("ambient");
  const [secondsLeft, setSecondsLeft] = React.useState<number | null>(null);

  const engine = useFrequencyEngine();
  const maxSeconds = isPremium ? Infinity : 30;

  // Use a ref to track if we're starting to avoid double-starts
  const startingRef = React.useRef(false);

  const startSession = React.useCallback(
    async (preset: FrequencyPreset, m: "pure" | "binaural" | "pad") => {
      if (startingRef.current) return;
      startingRef.current = true;

      const dur = isPremium ? 600 : 30; // premium: 10-min auto-stop, free: 30s
      // Set the timer display immediately for responsiveness
      setSecondsLeft(dur);

      try {
        await engine.start({
          carrierHz: preset.carrierHz,
          binauralBeatHz: preset.binauralBeatHz,
          mode: m,
          durationSec: dur,
          ambient,
          onTick: (s) => setSecondsLeft(s),
          onEnd: () => {
            setSecondsLeft(null);
            // log session
            api("/api/frequency/session", {
              method: "POST",
              body: JSON.stringify({
                intention: preset.key,
                frequencyHz: preset.carrierHz,
                baseHz: m === "binaural" ? preset.carrierHz : null,
                beatHz: m === "binaural" ? preset.binauralBeatHz : null,
                mode: m,
                durationSec: dur,
                completed: true,
              }),
            }).then(() => qc.invalidateQueries({ queryKey: ["me"] }));
            toast({ title: "Session complete", description: `${preset.label} · ${dur}s` });
          },
        });
      } catch (err) {
        console.error("Engine start failed:", err);
        setSecondsLeft(null);
      } finally {
        startingRef.current = false;
      }
    },
    [engine, isPremium, api, qc, toast, ambient]
  );

  const stopSession = React.useCallback(() => {
    const played = engine.stop();
    if (played && played > 2) {
      api("/api/frequency/session", {
        method: "POST",
        body: JSON.stringify({
          intention: selected.key,
          frequencyHz: selected.carrierHz,
          mode,
          durationSec: Math.round(played),
          completed: false,
        }),
      }).then(() => qc.invalidateQueries({ queryKey: ["me"] }));
    }
    setSecondsLeft(null);
  }, [engine, api, qc, selected, mode]);

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Frequencies"
        title={<>Tune your <span className="lum-text-gold">resonance</span></>}
        subtitle={
          isPremium
            ? "Unlimited sessions. Pure tones, binaural beats, and ambient pads."
            : "30 seconds per session on the free tier. Premium unlocks unlimited."
        }
      />

      {/* Now playing visualizer */}
      <ShellCard className="overflow-hidden">
        <div className="relative p-5 lum-glow-gold">
          <Visualizer active={!!secondsLeft} color={selected.color} hz={selected.carrierHz} beat={selected.binauralBeatHz} />
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="text-[11px] uppercase tracking-[0.2em] text-gold/80 font-medium">
              {secondsLeft ? "Now resonating" : "Selected"}
            </div>

            {/* Frequency display with circular progress ring */}
            <div className="relative mt-2 w-[120px] h-[120px] flex items-center justify-center">
              {secondsLeft !== null && (
                <TimerRing
                  progress={1 - secondsLeft / (isPremium ? 600 : 30)}
                  color={selected.color}
                  timeLabel={isPremium ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}` : `${secondsLeft}s`}
                />
              )}
              <div className="flex flex-col items-center">
                <div className="text-[32px] font-light leading-none lum-text-gold tabular-nums">
                  {selected.glyph}
                </div>
                <div className="text-[11px] text-ink-muted mt-0.5">Hz</div>
              </div>
            </div>

            <div className="mt-2 text-[14px] text-ink">{selected.label}</div>
            <div className="mt-0.5 text-[11px] text-ink-muted">
              {BRAINWAVE_LABELS[selected.beatType]} · {selected.binauralBeatHz}Hz beat
            </div>

            <div className="mt-4 flex items-center gap-2">
              {secondsLeft === null ? (
                <GoldButton onClick={() => startSession(selected, mode)}>
                  <Play className="w-4 h-4" />
                  {isPremium ? "Begin 10-min session" : "Begin 30s session"}
                </GoldButton>
              ) : (
                <GhostButton onClick={stopSession} className="border-gold/30 text-gold">
                  <Pause className="w-4 h-4" />
                  Stop
                </GhostButton>
              )}
            </div>
          </div>
        </div>
      </ShellCard>

      {/* Breathing pacer (only during active session) */}
      {secondsLeft !== null && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wind className="w-3.5 h-3.5 text-gold" />
            <span className="text-[11px] uppercase tracking-[0.16em] text-gold/80 font-medium">
              Breath guide
            </span>
          </div>
          <BreathingPacer active={!!secondsLeft} color={selected.color} />
        </GlassCard>
      )}

      {/* Ambient bed selector */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-[11px] uppercase tracking-[0.18em] text-gold/70 font-medium">
            Ambient bed
          </label>
          <span className="text-[10px] text-ink-muted">
            {secondsLeft !== null ? "Playing" : "Choose your soundscape"}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {AMBEDIENT_BEDS.map((bed) => {
            const isActive = ambient === bed.id;
            const Icon = bed.icon;
            return (
              <button
                key={bed.id}
                onClick={() => setAmbient(bed.id)}
                disabled={secondsLeft !== null}
                className={`relative rounded-xl p-2.5 border transition-all text-center ${
                  isActive
                    ? "border-gold/50 bg-gold/[0.10]"
                    : "border-white/6 bg-white/[0.015] hover:border-white/12"
                } ${secondsLeft !== null ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Icon
                  className={`w-4 h-4 mx-auto ${isActive ? "text-gold" : "text-ink-muted"}`}
                />
                <div className={`text-[10px] font-medium mt-1 ${isActive ? "text-gold" : "text-ink"}`}>
                  {bed.label}
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-ink-muted mt-1.5 leading-[13px]">
          {AMBEDIENT_BEDS.find((b) => b.id === ambient)?.desc}
        </p>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-3 gap-2">
        {([
          { id: "pure", label: "Pure Tone", icon: Waves, desc: "Single frequency" },
          { id: "binaural", label: "Binaural", icon: Brain, desc: "Hemisphere sync", premium: false },
          { id: "pad", label: "Ambient Pad", icon: AudioLines, desc: "Layered drone", premium: true },
        ] as const).map((m) => {
          const locked = !isPremium && m.premium;
          const active = mode === m.id;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => {
                if (locked) {
                  setPending(`${m.label} is a Premium feature.`);
                  setPremiumOpen(true);
                  return;
                }
                setMode(m.id);
              }}
              className={`relative rounded-xl p-3 border text-left transition-all ${
                active ? "border-gold/50 bg-gold/10" : "border-white/8 bg-white/[0.02] hover:border-white/15"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-gold" : "text-ink-muted"}`} />
              <div className="text-[12px] font-medium text-ink mt-1.5">{m.label}</div>
              <div className="text-[10px] text-ink-muted leading-[12px]">{m.desc}</div>
              {locked && <Lock className="absolute top-2 right-2 w-3 h-3 text-ink-muted" />}
            </button>
          );
        })}
      </div>

      {/* Affirmation */}
      <GlassCard className="p-4">
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-gold/80 font-medium mb-0.5">
              Speak while you listen
            </div>
            <p className="text-[13px] leading-[19px] text-ink italic">"{selected.affirmation}"</p>
          </div>
        </div>
      </GlassCard>

      {/* Preset grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-medium text-ink uppercase tracking-[0.14em]">All intentions</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {FREQUENCY_PRESETS.map((p) => {
            const active = selected.key === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setSelected(p)}
                className={`relative text-left rounded-xl p-3 border transition-all ${
                  active ? "border-gold/50 bg-gold/[0.08]" : "border-white/8 bg-white/[0.02] hover:border-white/15"
                }`}
                style={active ? { boxShadow: `0 0 0 1px ${p.color}40` } : undefined}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[18px] font-light tabular-nums" style={{ color: p.color }}>
                    {p.glyph}
                  </span>
                  <span className="w-2 h-2 rounded-full" style={{ background: p.color, opacity: active ? 1 : 0.4 }} />
                </div>
                <div className="text-[12px] font-medium text-ink mt-1 leading-[15px]">{p.label}</div>
                <div className="text-[10px] text-ink-muted leading-[14px] mt-0.5 line-clamp-3">{p.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <GlassCard className="p-3.5">
        <div className="flex items-start gap-2.5">
          <Info className="w-3.5 h-3.5 text-ink-muted mt-0.5 shrink-0" />
          <p className="text-[11px] leading-[15px] text-ink-muted">
            Use headphones for binaural beats — each ear receives a slightly different frequency,
            and the brain perceives the difference as a beat. Sit comfortably, breathe slowly,
            and let the tone fill the body.
          </p>
        </div>
      </GlassCard>

      <PremiumModal open={premiumOpen} onOpenChange={setPremiumOpen} />
    </div>
  );
}

function Visualizer({
  active, color, hz, beat,
}: { active: boolean; color: string; hz: number; beat: number }) {
  const rings = React.useMemo(
    () => Array.from({ length: 4 }, (_, i) => ({ id: i, delay: i * 0.4, size: 120 + i * 30 })),
    []
  );
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {active &&
        rings.map((r) => (
          <motion.span
            key={r.id}
            className="absolute rounded-full"
            style={{ width: r.size, height: r.size, border: `1px solid ${color}40` }}
            animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: r.delay, ease: "easeOut" }}
          />
        ))}
      {/* central pulse */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 90, height: 90,
          background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
        }}
        animate={active ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={active ? { duration: 60 / Math.max(beat, 1), repeat: Infinity, ease: "easeInOut" } : {}}
      />
    </div>
  );
}

/** Circular progress ring showing session time remaining. */
function TimerRing({
  progress,
  color,
  timeLabel,
}: {
  progress: number;
  color: string;
  timeLabel: string;
}) {
  const size = 120;
  const stroke = 2.5;
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <svg className="absolute inset-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${color}20`} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 4px ${color}66)` }}
      />
      <text x={size / 2} y={size - 4} textAnchor="middle" fill={color} fontSize="9" fontWeight="500" opacity="0.7">
        {timeLabel}
      </text>
    </svg>
  );
}
