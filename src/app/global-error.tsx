"use client";

import * as React from "react";

/**
 * global-error.tsx — catches errors that escape the root layout.
 * This is the last-resort error boundary in Next.js App Router.
 * Must render its own <html> and <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[Lumina Global Error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#000", color: "#E8EBE9", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ maxWidth: "360px", textAlign: "center" }}>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                margin: "0 auto 24px",
                background: "radial-gradient(circle, rgba(197,168,124,0.25), transparent 70%)",
                border: "1px solid rgba(197,168,124,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
              }}
            >
              ✦
            </div>
            <h1 style={{ fontSize: "20px", fontWeight: 300, margin: "0 0 8px", color: "#E8EBE9" }}>
              The veil thickened momentarily
            </h1>
            <p style={{ fontSize: "13px", color: "#9CA8A3", lineHeight: "19px", margin: "0 0 24px" }}>
              A disruption occurred. Take a breath, and we'll try again.
            </p>
            <button
              onClick={reset}
              style={{
                padding: "12px 24px",
                borderRadius: "999px",
                fontSize: "13px",
                fontWeight: 500,
                background: "#E8EBE9",
                color: "#050806",
                border: "none",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                display: "block",
                margin: "12px auto 0",
                fontSize: "12px",
                color: "#9CA8A3",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Reload Lumina
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
