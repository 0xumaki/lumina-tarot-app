"use client";

import * as React from "react";

/**
 * Notification permission helper.
 * On iOS Safari 16.4+ (installed PWA) web push is supported.
 * We also set the app badge via the Badging API when supported.
 */
export function useNotificationPermission() {
  const [granted, setGranted] = React.useState(false);
  const [supported, setSupported] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const supported = "Notification" in window;
    setSupported(supported);
    if (supported) setGranted(Notification.permission === "granted");
  }, []);

  const request = React.useCallback(async () => {
    if (!supported) return;
    try {
      const perm = await Notification.requestPermission();
      setGranted(perm === "granted");
      if (perm === "granted") {
        // welcome notification
        new Notification("Lumina is listening", {
          body: "Daily reminders are on. We'll nudge you at each goal's time.",
          icon: "/icons/icon-192.png",
        });
        // set badge
        const nav = navigator as any;
        if (nav.setAppBadge) {
          try { await nav.setAppBadge(1); } catch {}
        }
      }
    } catch {}
  }, [supported]);

  const setBadge = React.useCallback(async (n: number) => {
    const nav = navigator as any;
    if (nav.setAppBadge) {
      try {
        if (n > 0) await nav.setAppBadge(n);
        else await nav.clearAppBadge();
      } catch {}
    }
  }, []);

  return { granted, supported, request, setBadge };
}
