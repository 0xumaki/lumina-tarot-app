"use client";

import * as React from "react";
import { io, type Socket } from "socket.io-client";

/**
 * Connects to the Lumina reminder mini-service via websocket.
 * When a reminder arrives, shows a browser notification + toast.
 *
 * The service polls the DB for goals whose reminderTime matches now
 * and emits "reminder" events to the connected device.
 */

type Reminder = {
  goalId: string;
  title: string;
  statement: string;
  intention: string;
  frequencyHz: number | null;
  time: string;
};

export function useReminderService(
  deviceId: string | null,
  onReminder?: (r: Reminder) => void
) {
  const socketRef = React.useRef<Socket | null>(null);

  React.useEffect(() => {
    if (!deviceId) return;
    // Only connect if notifications are supported + granted
    if (!("Notification" in window)) return;

    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 5000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("register", deviceId);
    });

    socket.on("reminder", (reminder: Reminder) => {
      // Show browser notification if granted
      if (Notification.permission === "granted") {
        try {
          new Notification(`✦ ${reminder.title}`, {
            body: reminder.statement,
            icon: "/icons/icon-192.png",
            tag: `reminder-${reminder.goalId}`,
          });
        } catch {}
      }
      // Callback for in-app toast
      onReminder?.(reminder);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [deviceId, onReminder]);
}
