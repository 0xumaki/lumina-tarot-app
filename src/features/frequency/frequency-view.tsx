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
  FREQUENCY_PRESETS, BRAINWAVE_LABELS, SECRET_FREQUENCIES, type FrequencyPreset, type BrainwaveType, type SecretFrequencyPreset, getPreset,
} from "@/lib/frequencies";
import { useAppStore } from "@/lib/store";
import { PremiumModal } from "@/features/premium/premium-modal";
import { useFrequencyEngine, type AmbientBed } from "./audio-engine";
import { BreathingPacer } from "./breathing-pacer";
import { useRitual } from "@/hooks/use-ritual";
import { useAchievements } from "@/hooks/use-achievements";

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
  const { ritual, markStep } = useRitual();
  const { allComplete } = useAchievements();
  const setPending = useAppStore((s) => s.setPendingPremiumAction);
  const [premiumOpen, setPremiumOpen] = React.useState(false);

  const [selected, setSelected] = React.useState<FrequencyPreset>(FREQUENCY_PRESETS[0]);
  const [secretSelected, setSecretSelected] = React.useState<SecretFrequencyPreset | null>(null);
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

      // Mark ritual step: if tarot (step 3) is done, this is step 4 (Balance), otherwise step 1 (Cleanse)
      if (ritual.step3Tarot && !ritual.step4Balance) {
        markStep(4);
      } else if (!ritual.step1Cleanse) {
        markStep(1);
      }

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
            // Gentle session end — different message for free vs premium
            if (isPremium) {
              toast({
                title: `✦ ${preset.label} complete`,
                description: `${dur}s of resonance logged to your journey.`,
              });
            } else {
              toast({
                title: `✦ Your 30 seconds of resonance is complete`,
                description: `Premium unlocks unlimited sessions.`,
              });
            }
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

      {/* Breathing pacer — ABOVE the frequency card (only during active session) */}
      {secondsLeft !== null && (
        <BreathingPacer active={!!secondsLeft} color={selected.color} />
      )}

      {/* Frequency countdown card — award-winning redesign */}
      <div
        className="relative rounded-3xl overflow-hidden p-[1.5px]"
        style={{
          background: `linear-gradient(135deg, ${selected.color}55 0%, ${selected.color}11 40%, rgba(255,255,255,0.04) 70%, ${selected.color}22 100%)`,
        }}
      >
        <div
          className="w-full rounded-[22px] relative overflow-hidden"
          style={{ background: "linear-gradient(165deg, #0f0d0a 0%, #050403 100%)" }}
        >
            {/* Ambient glow layers */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(80% 50% at 50% 0%, ${selected.color}12 0%, transparent 70%)`,
              }}
            />
            <Visualizer active={!!secondsLeft} color={selected.color} hz={selected.carrierHz} beat={selected.binauralBeatHz} />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center px-6 py-8">
              {/* Status label */}
              <div className="flex items-center gap-2 mb-1">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: secondsLeft ? selected.color : "#7A8680" }}
                  animate={secondsLeft ? { opacity: [1, 0.3, 1] } : { opacity: 0.5 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-[11px] uppercase tracking-[0.24em] font-medium" style={{ color: secondsLeft ? selected.color : "#7A8680" }}>
                  {secondsLeft ? "Now resonating" : "Selected"}
                </span>
              </div>

              {/* Large frequency ring — the hero element */}
              <div className="relative mt-4 w-[160px] h-[160px] flex items-center justify-center">
                {/* Outer glow ring */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `radial-gradient(circle at 50% 40%, ${selected.color}18 0%, transparent 70%)`,
                  }}
                  animate={secondsLeft ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={secondsLeft ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : {}}
                />

                {/* Timer ring (only during playback) */}
                {secondsLeft !== null && (
                  <TimerRing
                    progress={1 - secondsLeft / (isPremium ? 600 : 30)}
                    color={selected.color}
                    timeLabel={isPremium ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}` : `${secondsLeft}s`}
                  />
                )}

                {/* Center: frequency number */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className="text-[40px] font-extralight leading-none tabular-nums"
                    style={{
                      color: selected.color,
                      textShadow: `0 0 20px ${selected.color}44`,
                    }}
                  >
                    {selected.glyph}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-ink-muted mt-1">Hz</div>
                </div>

                {/* Idle ring (when not playing) */}
                {secondsLeft === null && (
                  <svg className="absolute inset-0" width="160" height="160" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r="76" fill="none" stroke={`${selected.color}15`} strokeWidth="1" />
                    <circle cx="80" cy="80" r="68" fill="none" stroke={`${selected.color}08`} strokeWidth="0.5" strokeDasharray="2 4" />
                  </svg>
                )}
              </div>

              {/* Intention label */}
              <div className="mt-5 text-[16px] font-light text-ink tracking-[-0.01em]">
                {selected.label}
              </div>
              <div className="mt-1 text-[11px] text-ink-muted">
                {BRAINWAVE_LABELS[selected.beatType]} · {selected.binauralBeatHz}Hz beat
              </div>

              {/* Play/Stop button */}
              <div className="mt-6">
                {secondsLeft === null ? (
                  <button
                    onClick={() => startSession(selected, mode)}
                    className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[14px] font-medium text-black transition-all active:scale-[0.97]"
                    style={{
                      background: `linear-gradient(135deg, ${selected.color}ee, ${selected.color}aa)`,
                      boxShadow: `0 0 24px ${selected.color}44, inset 0 1px 0 rgba(255,255,255,0.3)`,
                    }}
                  >
                    <Play className="w-4 h-4" fill="currentColor" />
                    {isPremium ? "Begin 10-min session" : "Begin 30s session"}
                  </button>
                ) : (
                  <button
                    onClick={stopSession}
                    className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[14px] font-medium border transition-all active:scale-[0.97]"
                    style={{
                      borderColor: `${selected.color}50`,
                      color: selected.color,
                      background: `${selected.color}10`,
                    }}
                  >
                    <Pause className="w-4 h-4" fill="currentColor" />
                    Stop
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Ambient bed selector */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-[12px] uppercase tracking-[0.18em] text-gold/70 font-medium">
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
        <p className="text-[11px] text-ink-muted mt-1.5 leading-[13px]">
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

      {/* Secret Frequencies — only for Luminaries (all 36 achievements unlocked) */}
      {allComplete && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <ShellCard className="overflow-hidden">
            <div className="relative p-4 lum-glow-gold">
              {/* Animated aurora background */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(60% 50% at 30% 20%, rgba(197,168,124,0.12) 0%, transparent 70%), radial-gradient(40% 40% at 80% 80%, rgba(158,138,201,0.08) 0%, transparent 70%)" }}
                animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-gold" />
                    <h3 className="text-[12px] uppercase tracking-[0.22em] text-gold font-medium">Secret Frequencies</h3>
                  </div>
                  <span className="text-[9.5px] uppercase tracking-[0.18em] text-gold/60 font-medium">Luminary Only</span>
                </div>
                <p className="text-[11px] text-ink-muted leading-[15px] mb-3 max-w-[300px]">
                  The three crown jewels of the Solfeggio scale — unlocked for completing all 36 achievements.
                </p>

                {/* Secret frequency cards */}
                <div className="space-y-2.5">
                  {SECRET_FREQUENCIES.map((sf, i) => {
                    const isActive = secretSelected?.key === sf.key;
                    return (
                      <motion.button
                        key={sf.key}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.08 }}
                        onClick={() => {
                          setSecretSelected(isActive ? null : sf);
                          // Also create a compatible FrequencyPreset-like object so the engine can use it
                          setSelected({
                            key: sf.key as any,
                            label: sf.label,
                            glyph: sf.glyph,
                            carrierHz: sf.carrierHz,
                            binauralBeatHz: sf.binauralBeatHz,
                            beatType: sf.beatType,
                            color: sf.color,
                            affirmation: sf.affirmation,
                            keywords: [],
                            description: sf.description,
                          });
                        }}
                        className="relative w-full text-left rounded-2xl p-3.5 border transition-all overflow-hidden"
                        style={{
                          borderColor: isActive ? `${sf.color}66` : "rgba(197,168,124,0.2)",
                          background: isActive
                            ? `linear-gradient(135deg, ${sf.color}1a, ${sf.color}08)`
                            : "rgba(255,255,255,0.015)",
                          boxShadow: isActive ? `0 0 24px ${sf.color}33, inset 0 0 12px ${sf.color}10` : "none",
                        }}
                      >
                        {/* Shimmer line at top */}
                        <div
                          className="absolute top-0 left-0 right-0 h-px"
                          style={{ background: `linear-gradient(90deg, transparent, ${sf.color}80, transparent)` }}
                        />
                        <div className="flex items-start gap-3">
                          {/* Glyph in glowing circle */}
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 relative"
                            style={{
                              background: `radial-gradient(circle at 30% 30%, ${sf.color}33, ${sf.color}10 60%, transparent 80%)`,
                              border: `1px solid ${sf.color}44`,
                              boxShadow: `0 0 12px ${sf.color}33`,
                            }}
                          >
                            <motion.span
                              className="text-[20px] font-light"
                              style={{ color: sf.color }}
                              animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            >
                              {sf.glyph}
                            </motion.span>
                          </div>
                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-[15px] font-medium text-ink tabular-nums">{sf.label}</span>
                              <span className="text-[10.5px] font-medium" style={{ color: sf.color }}>{sf.subtitle}</span>
                            </div>
                            <p className="text-[10.5px] text-ink-muted leading-[14px] mt-0.5 line-clamp-2">{sf.description}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[9px] uppercase tracking-[0.15em] text-ink-muted/70">{BRAINWAVE_LABELS[sf.beatType].split(" · ")[0]}</span>
                              <span className="text-[9px] text-ink-muted/40">·</span>
                              <span className="text-[9px] text-ink-muted/70">Beat {sf.binauralBeatHz} Hz</span>
                            </div>
                          </div>
                          {/* Active indicator */}
                          {isActive && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2 h-2 rounded-full shrink-0 mt-1"
                              style={{ background: sf.color, boxShadow: `0 0 8px ${sf.color}` }}
                            />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Blessing footer */}
                {secretSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3"
                  >
                    <div className="rounded-xl p-3 border border-gold/15 bg-gold/[0.04]">
                      <div className="text-[9px] uppercase tracking-[0.18em] text-gold/70 font-medium mb-1">✦ Blessing</div>
                      <p className="text-[10.5px] text-ink-muted leading-[15px] italic">"{secretSelected.blessing}"</p>
                      <p className="text-[10.5px] text-ink-muted leading-[15px] mt-1.5">Affirmation: <span className="text-gold/90">"{secretSelected.affirmation}"</span></p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </ShellCard>
        </motion.div>
      )}

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
    () => Array.from({ length: 5 }, (_, i) => ({ id: i, delay: i * 0.5, size: 140 + i * 36 })),
    []
  );
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {active &&
        rings.map((r) => (
          <motion.span
            key={r.id}
            className="absolute rounded-full"
            style={{ width: r.size, height: r.size, border: `1px solid ${color}30` }}
            animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: r.delay, ease: "easeOut" }}
          />
        ))}
    </div>
  );
}

/** Circular progress ring — premium award-winning design with dual rings + glow. */
function TimerRing({
  progress,
  color,
  timeLabel,
}: {
  progress: number;
  color: string;
  timeLabel: string;
}) {
  const size = 160;
  const stroke = 3;
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <svg className="absolute inset-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background ring */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${color}12`} strokeWidth={stroke} />
      {/* Progress ring with glow */}
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
        style={{
          transition: "stroke-dashoffset 1s linear",
          filter: `drop-shadow(0 0 6px ${color}88)`,
        }}
      />
      {/* Inner decorative ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r - 8}
        fill="none"
        stroke={`${color}08`}
        strokeWidth={0.5}
        strokeDasharray="1 3"
      />
      {/* Time label at bottom */}
      <text
        x={size / 2}
        y={size - 6}
        textAnchor="middle"
        fill={color}
        fontSize="11"
        fontWeight="400"
        opacity="0.6"
        style={{ letterSpacing: "0.05em" }}
      >
        {timeLabel}
      </text>
    </svg>
  );
}
