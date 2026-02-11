import "server-only";

/**
 * Socket.IO server-side event emitter.
 *
 * Emits realtime events in two ways:
 *
 * 1. **In-process** — directly broadcasts via the embedded Socket.IO server
 *    (started in instrumentation.ts). This is the primary path and works
 *    without any external dependencies.
 *
 * 2. **Redis pub/sub** — also publishes to Redis for multi-instance setups.
 *    If you run multiple Next.js replicas, each has its own embedded socket
 *    server. Redis ensures events reach all instances.
 *
 * In most single-VPS Docker setups, only the in-process path is needed.
 */

import { getRedis } from "@/lib/redis";
import { broadcastEvent } from "@/lib/socket-io-server";

// ── Event types ──────────────────────────────────────────────────
export type RealtimeEventType =
  | "notification:new"
  | "activity:new"
  | "message:new"
  | "poll:created"
  | "poll:voted"
  | "news:published"
  | "points:updated"
  | "hr:request_update"
  | "reservation:update"
  | "marketplace:update"
  | "calendar:update"
  | "reward:update";

export interface RealtimeEvent {
  type: RealtimeEventType;
  /** Target user ID, or "all" for broadcast */
  target: string | "all";
  payload: Record<string, unknown>;
  timestamp: number;
}

const REDIS_CHANNEL = "kovo:realtime";

/**
 * Emit a realtime event. Broadcasts in-process AND via Redis.
 */
export async function emitRealtimeEvent(
  type: RealtimeEventType,
  target: string | "all",
  payload: Record<string, unknown>,
) {
  const event: RealtimeEvent = {
    type,
    target,
    payload,
    timestamp: Date.now(),
  };

  // 1. In-process broadcast (embedded Socket.IO server)
  broadcastEvent(event);

  // 2. Redis pub/sub (for multi-instance — optional)
  const redis = getRedis();
  if (redis) {
    try {
      await redis.publish(REDIS_CHANNEL, JSON.stringify(event));
    } catch (err) {
      console.error("[REALTIME] Redis publish selhal:", err);
    }
  }

  console.log(`[REALTIME] ${type} → ${target}`, payload);
}
