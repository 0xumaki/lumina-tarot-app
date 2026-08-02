import * as React from "react";

/**
 * loading.tsx — shown automatically by Next.js while route segments load.
 * A mystical, brand-aligned loading state.
 */
export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          border: "2px solid rgba(197,168,124,0.2)",
          borderTopColor: "rgba(197,168,124,0.8)",
          animation: "spin 1s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
