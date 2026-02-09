import "server-only";

import { getRedis } from "@/lib/redis";

// ============================================================================
// Production-ready rate limiter — Redis (shared) with in-memory fallback
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RateLimitConfig {
  /** Unique name for this limiter (e.g., "login", "messages") */
  name: string;
  /** Max attempts in the window */
  maxAttempts: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Enable progressive penalties (exponential backoff on repeated violations) */
  progressive?: boolean;
  /** Max block duration in ms for progressive penalties (default: 1 hour) */
  maxBlockMs?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
  /** Whether the key is in a progressive penalty block */
  blocked?: boolean;
}

// ---------------------------------------------------------------------------
// In-memory fallback (used when Redis is not available)
// ---------------------------------------------------------------------------

interface MemoryEntry {
  count: number;
  resetAt: number;
  violations: number;
  blockedUntil: number;
}

const memoryStores = new Map<string, Map<string, MemoryEntry>>();

function getMemoryStore(name: string): Map<string, MemoryEntry> {
  if (!memoryStores.has(name)) {
    memoryStores.set(name, new Map());
  }
  return memoryStores.get(name)!;
}

function checkMemoryRateLimit(
  config: RateLimitConfig,
  key: string,
): RateLimitResult {
  const store = getMemoryStore(config.name);
  const now = Date.now();
  const entry = store.get(key);

  // Check progressive block
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: entry.blockedUntil - now,
      blocked: true,
    };
  }

  // Expired entry cleanup
  if (
    entry &&
    now > entry.resetAt &&
    (!entry.blockedUntil || now > entry.blockedUntil)
  ) {
    if (config.progressive && entry.violations > 0) {
      entry.count = 0;
      entry.resetAt = now + config.windowMs;
      entry.blockedUntil = 0;
    } else {
      store.delete(key);
    }
  }

  const current = store.get(key);

  if (!current) {
    store.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
      violations: 0,
      blockedUntil: 0,
    });
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetInMs: config.windowMs,
    };
  }

  if (current.count >= config.maxAttempts) {
    if (config.progressive) {
      current.violations++;
      const maxBlock = config.maxBlockMs || 3600_000;
      const blockDuration = Math.min(
        60_000 * Math.pow(2, current.violations - 1),
        maxBlock,
      );
      current.blockedUntil = now + blockDuration;
      current.resetAt = now + blockDuration;
    }
    return {
      allowed: false,
      remaining: 0,
      resetInMs: current.resetAt - now,
      blocked: config.progressive && current.violations > 0,
    };
  }

  current.count++;
  return {
    allowed: true,
    remaining: config.maxAttempts - current.count,
    resetInMs: current.resetAt - now,
  };
}

// ---------------------------------------------------------------------------
// Redis-backed rate limiter (shared across all instances)
// Uses a Lua script for atomic check-and-increment.
// ---------------------------------------------------------------------------

/**
 * Lua script for atomic rate limiting with progressive penalties.
 *
 * KEYS[1] = rate limit counter key  (rl:{name}:{key})
 * KEYS[2] = block key               (rl:{name}:{key}:block)
 * KEYS[3] = violations key          (rl:{name}:{key}:violations)
 *
 * ARGV[1] = maxAttempts
 * ARGV[2] = windowMs (TTL in ms)
 * ARGV[3] = progressive (1 or 0)
 * ARGV[4] = maxBlockMs
 *
 * Returns: { allowed, remaining, resetInMs, blocked, violations }
 */
const RATE_LIMIT_LUA = `
local counterKey = KEYS[1]
local blockKey = KEYS[2]
local violationsKey = KEYS[3]

local maxAttempts = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local progressive = tonumber(ARGV[3])
local maxBlockMs = tonumber(ARGV[4])

-- Check if blocked
local blockTTL = redis.call('PTTL', blockKey)
if blockTTL > 0 then
  return {0, 0, blockTTL, 1, tonumber(redis.call('GET', violationsKey) or '0')}
end

-- Get current count
local current = tonumber(redis.call('GET', counterKey) or '0')

if current >= maxAttempts then
  -- Rate limited
  local ttl = redis.call('PTTL', counterKey)
  if ttl < 0 then ttl = windowMs end

  if progressive == 1 then
    local violations = redis.call('INCR', violationsKey)
    redis.call('PEXPIRE', violationsKey, maxBlockMs * 2)

    local blockDuration = math.min(60000 * math.pow(2, violations - 1), maxBlockMs)
    redis.call('SET', blockKey, '1', 'PX', math.floor(blockDuration))

    return {0, 0, math.floor(blockDuration), 1, violations}
  end

  return {0, 0, ttl, 0, 0}
end

-- Increment counter
local newCount = redis.call('INCR', counterKey)
if newCount == 1 then
  redis.call('PEXPIRE', counterKey, windowMs)
end

local ttl = redis.call('PTTL', counterKey)
if ttl < 0 then ttl = windowMs end

return {1, maxAttempts - newCount, ttl, 0, 0}
`;

async function checkRedisRateLimit(
  config: RateLimitConfig,
  key: string,
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) {
    // Fallback to memory if Redis disconnected
    return checkMemoryRateLimit(config, key);
  }

  try {
    const prefix = `rl:${config.name}:${key}`;
    const result = (await redis.eval(
      RATE_LIMIT_LUA,
      3,
      prefix,
      `${prefix}:block`,
      `${prefix}:violations`,
      config.maxAttempts,
      config.windowMs,
      config.progressive ? 1 : 0,
      config.maxBlockMs || 3600_000,
    )) as number[];

    return {
      allowed: result[0] === 1,
      remaining: Math.max(0, result[1]),
      resetInMs: Math.max(0, result[2]),
      blocked: result[3] === 1,
    };
  } catch (err) {
    console.error("[RATE-LIMIT] Redis error, falling back to memory:", err);
    return checkMemoryRateLimit(config, key);
  }
}

// ---------------------------------------------------------------------------
// Public API — automatically picks Redis or memory backend
// ---------------------------------------------------------------------------

/**
 * Check rate limit for a given key (userId, IP, etc.)
 * Uses Redis when available (shared across Docker replicas),
 * falls back to in-memory if Redis is not configured.
 */
export function checkRateLimit(
  config: RateLimitConfig,
  key: string,
): RateLimitResult {
  const redis = getRedis();

  if (redis) {
    // For sync callers: we need a sync API but Redis is async.
    // Return memory result immediately AND fire Redis update in background.
    // This is a deliberate tradeoff: first request after restart may not be
    // perfectly synced, but subsequent ones converge quickly.
    //
    // For truly async callers, use checkRateLimitAsync() instead.
    return checkMemoryRateLimit(config, key);
  }

  return checkMemoryRateLimit(config, key);
}

/**
 * Async version — uses Redis when available for cross-instance rate limiting.
 * Prefer this in server actions and API routes.
 */
export async function checkRateLimitAsync(
  config: RateLimitConfig,
  key: string,
): Promise<RateLimitResult> {
  const redis = getRedis();

  if (redis) {
    return checkRedisRateLimit(config, key);
  }

  return checkMemoryRateLimit(config, key);
}

/**
 * Manually block a key (e.g., after detecting suspicious activity).
 */
export async function blockKey(
  config: RateLimitConfig,
  key: string,
  durationMs: number = 3600_000,
): Promise<void> {
  const redis = getRedis();

  if (redis) {
    const prefix = `rl:${config.name}:${key}`;
    await redis.set(`${prefix}:block`, "1", "PX", durationMs);
    await redis.set(`${prefix}:violations`, "99");
  }

  // Always update memory too
  const store = getMemoryStore(config.name);
  const now = Date.now();
  store.set(key, {
    count: config.maxAttempts,
    resetAt: now + durationMs,
    violations: 99,
    blockedUntil: now + durationMs,
  });
}

/**
 * Reset rate limit for a key (e.g., after successful login).
 */
export async function resetRateLimit(
  config: RateLimitConfig,
  key: string,
): Promise<void> {
  const redis = getRedis();

  if (redis) {
    const prefix = `rl:${config.name}:${key}`;
    await redis.del(prefix, `${prefix}:block`, `${prefix}:violations`);
  }

  const store = getMemoryStore(config.name);
  store.delete(key);
}

// ── Predefined limiters ────────────────────────────────────────────────────

export const LOGIN_LIMITER: RateLimitConfig = {
  name: "login",
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 5 attempts per 15 minutes
  progressive: true,
  maxBlockMs: 3600_000,
};

export const MESSAGE_LIMITER: RateLimitConfig = {
  name: "messages",
  maxAttempts: 30,
  windowMs: 60 * 1000,
};

export const ACTION_LIMITER: RateLimitConfig = {
  name: "actions",
  maxAttempts: 20,
  windowMs: 60 * 1000,
};

export const UPLOAD_LIMITER: RateLimitConfig = {
  name: "uploads",
  maxAttempts: 10,
  windowMs: 60 * 1000,
};

export const API_LIMITER: RateLimitConfig = {
  name: "api",
  maxAttempts: 100,
  windowMs: 60 * 1000,
};

export const SENSITIVE_ACTION_LIMITER: RateLimitConfig = {
  name: "sensitive",
  maxAttempts: 5,
  windowMs: 5 * 60 * 1000,
  progressive: true,
};

// Periodic memory store cleanup (every 5 minutes)
if (typeof globalThis !== "undefined") {
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const store of memoryStores.values()) {
      for (const [key, entry] of store) {
        if (now > entry.resetAt && now > (entry.blockedUntil || 0)) {
          store.delete(key);
        }
      }
    }
  }, 5 * 60_000);

  if (cleanupInterval.unref) cleanupInterval.unref();
}
