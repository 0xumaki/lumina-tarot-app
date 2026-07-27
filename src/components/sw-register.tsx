"use client";

import * as React from "react";

/**
 * Registers the Lumina service worker for PWA installability + offline support.
 * Only runs in production-ish contexts to avoid caching issues during dev.
 */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    // Register even in dev so installability works; the SW is harmless.
    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          // Silently ignore — SW is a progressive enhancement.
          console.warn("SW registration failed:", err?.message);
        });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
