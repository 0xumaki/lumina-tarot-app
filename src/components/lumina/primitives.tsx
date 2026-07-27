"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GlassCard — the base Lumina surface.
 * rgba(18,24,21,0.5), hairline white border, inset highlight, backdrop blur.
 */
export function GlassCard({
  className,
  children,
  float,
  ...props
}: React.ComponentProps<"div"> & { float?: boolean }) {
  return (
    <div
      className={cn(
        float ? "lum-glass-float" : "lum-glass",
        "rounded-2xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * ShellCard — gradient-border premium frame around an inner glass surface.
 */
export function ShellCard({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("lum-border-shell", className)} {...props}>
      <div className="lum-border-shell__inner lum-glass rounded-[15px]">
        {children}
      </div>
    </div>
  );
}

/** Pill — small label. */
export function Pill({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "gold" | "leaf";
  className?: string;
}) {
  return (
    <span
      className={cn(
        variant === "gold" ? "lum-pill-gold" : variant === "leaf" ? "lum-pill-leaf" : "lum-pill",
        className
      )}
    >
      {children}
    </span>
  );
}

/** SectionTitle — thin display headline with optional eyebrow. */
export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      {eyebrow && (
        <div className="text-[11px] uppercase tracking-[0.22em] text-gold/80 font-medium">
          {eyebrow}
        </div>
      )}
      <h2 className="text-[22px] leading-[28px] font-light tracking-[-0.02em] text-ink">
        {title}
      </h2>
      {subtitle && (
        <p className="text-[13px] leading-[18px] text-ink-muted">{subtitle}</p>
      )}
    </div>
  );
}

/** GoldButton — primary CTA, light surface, gold hover. */
export const GoldButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button">
>(({ className, children, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3",
      "bg-[#E8EBE9] text-[#050806] text-[13px] font-medium tracking-[-0.01em]",
      "transition-all duration-150 hover:bg-white active:scale-[0.98]",
      "disabled:opacity-40 disabled:pointer-events-none",
      "shadow-[0_1px_0_0_rgba(255,255,255,0.4)_inset,0_8px_24px_-8px_rgba(197,168,124,0.4)]",
      className
    )}
    {...props}
  >
    {children}
  </button>
));
GoldButton.displayName = "GoldButton";

/** GhostButton — secondary, ghost outline. */
export const GhostButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button">
>(({ className, children, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3",
      "text-ink-muted text-[13px] font-medium",
      "border border-white/10 bg-white/[0.02] backdrop-blur",
      "transition-all duration-150 hover:text-ink hover:border-white/20 hover:bg-white/[0.04] active:scale-[0.98]",
      "disabled:opacity-40 disabled:pointer-events-none",
      className
    )}
    {...props}
  >
    {children}
  </button>
));
GhostButton.displayName = "GhostButton";

/** Divider — hairline gradient. */
export function Divider({ className }: { className?: string }) {
  return <div className={cn("lum-divider", className)} />;
}

/** StarField — subtle twinkling dots backdrop (decorative). */
export function StarField({ count = 24 }: { count?: number }) {
  const stars = React.useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        delay: Math.random() * 4,
        dur: Math.random() * 3 + 2,
      })),
    [count]
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((s) => (
        <span
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            opacity: 0.4,
            animation: `lum-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes lum-twinkle{0%,100%{opacity:.15;transform:scale(.8)}50%{opacity:.7;transform:scale(1.2)}}`}</style>
    </div>
  );
}
