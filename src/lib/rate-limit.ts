/**
 * Lightweight in-memory rate limiter for API routes.
 * Tracks requests per device ID + endpoint, with a sliding window.
 *
 * For production with multiple serverless instances, upgrade to
 * Upstash Redis rate limiting (see vercel/edge-rate-limiting).
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const limits = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of limits) {
      if (entry.resetAt < now) {
        limits.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Check rate limit for a given key.
 * @param key - Unique identifier (e.g., `tarot:device_123`)
 * @param maxRequests - Maximum requests in the window
 * @param windowMs - Window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = limits.get(key);

  if (!entry || entry.resetAt < now) {
    // First request or window expired
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs,
    };
    limits.set(key, newEntry);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: newEntry.resetAt,
    };
  }

  // Increment count
  entry.count++;
  const allowed = entry.count <= maxRequests;

  return {
    allowed,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}

/** Convenience: rate limit for tarot readings (free tier: 10/hour, premium: 100/hour) */
export function checkTarotRateLimit(deviceId: string, isPremium: boolean) {
  const maxRequests = isPremium ? 100 : 10;
  return checkRateLimit(`tarot:${deviceId}`, maxRequests, 60 * 60 * 1000); // 1 hour
}

/** Convenience: rate limit for frequency sessions (30/hour) */
export function checkFrequencyRateLimit(deviceId: string) {
  return checkRateLimit(`freq:${deviceId}`, 30, 60 * 60 * 1000); // 1 hour
}

/** Convenience: rate limit for mood check-ins (20/hour) */
export function checkMoodRateLimit(deviceId: string) {
  return checkRateLimit(`mood:${deviceId}`, 20, 60 * 60 * 1000); // 1 hour
}
