import "server-only";

// ============================================================================
// Generic in-memory rate limiter for server actions and API routes
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(name: string): Map<string, RateLimitEntry> {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  return stores.get(name)!;
}

interface RateLimitConfig {
  /** Unique name for this limiter (e.g., "login", "messages") */
  name: string;
  /** Max attempts in the window */
  maxAttempts: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
}

/**
 * Check rate limit for a given key (userId, IP, etc.)
 */
export function checkRateLimit(
  config: RateLimitConfig,
  key: string,
): RateLimitResult {
  const store = getStore(config.name);
  const now = Date.now();
  const entry = store.get(key);

  // Clean up expired entry
  if (entry && now > entry.resetAt) {
    store.delete(key);
  }

  const current = store.get(key);

  if (!current) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetInMs: config.windowMs,
    };
  }

  if (current.count >= config.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: current.resetAt - now,
    };
  }

  current.count++;
  return {
    allowed: true,
    remaining: config.maxAttempts - current.count,
    resetInMs: current.resetAt - now,
  };
}

// Predefined limiters
export const LOGIN_LIMITER: RateLimitConfig = {
  name: "login",
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 5 attempts per 15 minutes
};

export const MESSAGE_LIMITER: RateLimitConfig = {
  name: "messages",
  maxAttempts: 30,
  windowMs: 60 * 1000, // 30 messages per minute
};

export const ACTION_LIMITER: RateLimitConfig = {
  name: "actions",
  maxAttempts: 20,
  windowMs: 60 * 1000, // 20 actions per minute
};

// Periodic cleanup (every 5 minutes)
if (typeof globalThis !== "undefined") {
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const store of stores.values()) {
      for (const [key, entry] of store) {
        if (now > entry.resetAt) store.delete(key);
      }
    }
  }, 5 * 60_000);

  // Don't block process exit
  if (cleanupInterval.unref) cleanupInterval.unref();
}
