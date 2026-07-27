"use client";

import * as React from "react";

const DEVICE_ID_KEY = "lumina.deviceId";

/** Generate a stable random device id, persisted in localStorage. */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id =
        "dev_" +
        (crypto.randomUUID?.() ||
          Math.random().toString(36).slice(2) + Date.now().toString(36));
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "dev_anonymous";
  }
}

/** A fetch wrapper that injects the device id header. */
export function useApi() {
  const deviceId = React.useSyncExternalStore(
    () => () => {},
    () => (typeof window !== "undefined" ? getOrCreateDeviceId() : ""),
    () => ""
  );

  const api = React.useCallback(
    async (path: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      headers.set("x-device-id", deviceId || getOrCreateDeviceId());
      if (init.body && typeof init.body === "string") {
        headers.set("content-type", "application/json");
      }
      const res = await fetch(path, { ...init, headers });
      return res;
    },
    [deviceId]
  );

  return api;
}
