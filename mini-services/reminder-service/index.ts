/**
 * Lumina Reminder Service — a websocket mini-service that checks for
 * manifestation goals whose reminderTime has arrived and emits a
 * "reminder" event to the connected client.
 *
 * Port: 3003
 * The frontend connects via: io("/?XTransformPort=3003")
 *
 * Since this is an anonymous device model with no auth, the client sends
 * its deviceId on connection. The service polls the DB every 30s for goals
 * whose reminderTime matches the current HH:mm and emits a reminder.
 *
 * NOTE: In production this would use push notifications. For the PWA demo,
 * this service provides real-time reminders while the app is open.
 */

import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

const PORT = 3003;
const db = new PrismaClient();

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*" },
  path: "/",
});

// Track connected devices: socketId → deviceId
const connectedDevices = new Map<string, string>();

io.on("connection", (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  socket.on("register", (deviceId: string) => {
    if (deviceId) {
      connectedDevices.set(socket.id, deviceId);
      console.log(`[register] ${socket.id} → ${deviceId}`);
    }
  });

  socket.on("disconnect", () => {
    connectedDevices.delete(socket.id);
    console.log(`[socket] disconnected: ${socket.id}`);
  });
});

/** Check for goals whose reminderTime matches the current HH:mm and emit reminders. */
async function checkReminders() {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  try {
    // Find active goals with reminderTime matching now
    const goals = await db.goal.findMany({
      where: { status: "active", reminderTime: hhmm },
      select: {
        id: true,
        deviceId: true,
        title: true,
        statement: true,
        intention: true,
        frequencyHz: true,
      },
    });

    if (goals.length === 0) return;

    // For each goal, check if already confirmed today
    for (const goal of goals) {
      const alreadyConfirmed = await db.confirmation.findUnique({
        where: { goalId_date: { goalId: goal.id, date: today } },
      });
      if (alreadyConfirmed) continue; // skip — already confirmed

      // Find if the device is connected
      for (const [socketId, deviceId] of connectedDevices) {
        if (deviceId === goal.deviceId) {
          io.to(socketId).emit("reminder", {
            goalId: goal.id,
            title: goal.title,
            statement: goal.statement,
            intention: goal.intention,
            frequencyHz: goal.frequencyHz,
            time: hhmm,
          });
          console.log(`[reminder] sent to ${deviceId} for goal "${goal.title}" at ${hhmm}`);
        }
      }
    }
  } catch (err) {
    console.error("[reminder] check failed:", err);
  }
}

// Poll every 30 seconds
setInterval(checkReminders, 30_000);
// Also check immediately on startup
setTimeout(checkReminders, 2000);

httpServer.listen(PORT, () => {
  console.log(`✦ Lumina Reminder Service running on port ${PORT}`);
  console.log(`  Polling for goal reminders every 30s…`);
});
