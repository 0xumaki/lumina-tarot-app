"use client";

import * as React from "react";

/**
 * LuminaryParticles — a floating field of golden particles that drift upward.
 * Only rendered when the Luminary theme is active (all 36 achievements unlocked).
 * Purely decorative — pointer-events: none, fixed behind content.
 */
export function LuminaryParticles({ count = 18 }: { count?: number }) {
  // Pre-compute random positions/durations once
  const particles = React.useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const left = Math.random() * 100;
        const size = 1.5 + Math.random() * 2.5;
        const duration = 12 + Math.random() * 18;
        const delay = Math.random() * 20;
        const opacity = 0.3 + Math.random() * 0.5;
        return { id: i, left, size, duration, delay, opacity };
      }),
    [count]
  );

  return (
    <div className="luminary-particles" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
}
