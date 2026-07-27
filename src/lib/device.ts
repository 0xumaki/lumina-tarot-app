import { db } from "@/lib/db";

/**
 * Anonymous device-based identity.
 * The client sends a stable `x-device-id` header (generated in localStorage).
 * We upsert a Device row. No email, no password, no friction.
 */

export async function getOrCreateDevice(deviceId: string) {
  if (!deviceId) throw new Error("Missing device id");
  const device = await db.device.upsert({
    where: { deviceId },
    update: {},
    create: { deviceId },
  });
  return device;
}

export async function getDeviceByDeviceId(deviceId: string) {
  return db.device.findUnique({ where: { deviceId } });
}

/**
 * Extract the device id from request headers.
 */
export function getDeviceIdFromHeaders(headers: Headers): string {
  return (
    headers.get("x-device-id") ||
    headers.get("X-Device-Id") ||
    ""
  );
}

export async function requireDevice(headers: Headers) {
  const deviceId = getDeviceIdFromHeaders(headers);
  if (!deviceId) throw new Error("Missing x-device-id header");
  return getOrCreateDevice(deviceId);
}
