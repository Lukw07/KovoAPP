import "server-only";

import Redis from "ioredis";

// ============================================================================
// Redis Client — shared connection for rate limiting, caching, etc.
// ============================================================================

let redis: Redis | null = null;

/**
 * Get or create a Redis client singleton.
 * Returns null if REDIS_URL is not configured (falls back to in-memory).
 */
export function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  redis = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null; // Stop retrying after 5 attempts
      return Math.min(times * 200, 2000); // Exponential backoff up to 2s
    },
    lazyConnect: true,
    enableReadyCheck: true,
    // TLS support — auto-detect from URL scheme
    ...(url.startsWith("rediss://") ? { tls: {} } : {}),
  });

  redis.on("error", (err) => {
    console.error("[REDIS] Connection error:", err.message);
  });

  redis.on("connect", () => {
    console.log("[REDIS] Connected successfully");
  });

  // Connect lazily on first use
  redis.connect().catch((err) => {
    console.error("[REDIS] Initial connection failed:", err.message);
    redis = null;
  });

  return redis;
}

/**
 * Gracefully disconnect Redis on process shutdown.
 */
export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
