/**
 * Embedded Socket.IO server — runs inside the Next.js process.
 *
 * This eliminates the need for a separate socket server process.
 * It starts on a separate port (SOCKET_PORT, default 3001) alongside
 * the Next.js server (port 3000).
 *
 * Features:
 *  - Auto-starts via instrumentation.ts when Next.js boots
 *  - Redis pub/sub for multi-instance support (optional)
 *  - In-process event bus when emitRealtimeEvent() is called from the same process
 *  - Health endpoint at /health
 *  - Graceful shutdown
 *
 * In Docker, only port 3000 (Next.js) and 3001 (WebSocket) need to be exposed.
 * In dev, both start automatically with `npm run dev`.
 */

import { createServer, type Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";

const PORT = parseInt(process.env.SOCKET_PORT || "3001", 10);
const REDIS_CHANNEL = "kovo:realtime";

let io: Server | null = null;
let httpServer: HttpServer | null = null;
let started = false;

/**
 * Start the embedded Socket.IO server. Safe to call multiple times —
 * only the first call actually starts the server.
 */
export function startSocketServer(): void {
  if (started) return;
  started = true;

  const allowedOrigins = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).split(",").map((s) => s.trim());

  // ── HTTP server (health check) ──────────────────────────────────
  httpServer = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          connections: io?.engine?.clientsCount ?? 0,
          uptime: process.uptime(),
        }),
      );
      return;
    }
    res.writeHead(404);
    res.end();
  });

  // ── Socket.IO ───────────────────────────────────────────────────
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // ── Connection handling ─────────────────────────────────────────
  io.on("connection", (socket: Socket) => {
    console.log(`[WS] ✔ Klient připojen: ${socket.id}`);

    socket.on("auth", (userId: string) => {
      if (userId && typeof userId === "string") {
        socket.join(`user:${userId}`);
        socket.data.userId = userId;
        console.log(`[WS] ✔ User ${userId} přiřazen do room user:${userId}`);
      }
    });

    socket.on("disconnect", (reason: string) => {
      console.log(`[WS] ✖ Klient odpojen: ${socket.id} (${reason})`);
    });
  });

  // ── Redis subscriber (optional) ─────────────────────────────────
  setupRedisSubscriber();

  // ── Start listening ─────────────────────────────────────────────
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[WS] ✔ Socket.IO server běží na portu ${PORT}`);
    console.log(`[WS]   CORS: ${allowedOrigins.join(", ")}`);
  });

  // ── Graceful shutdown ───────────────────────────────────────────
  const shutdown = () => {
    console.log("[WS] Ukončuji Socket.IO server...");
    io?.close();
    httpServer?.close();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

/**
 * Get the Socket.IO server instance (for in-process event emission).
 * Returns null if the server hasn't started yet.
 */
export function getIO(): Server | null {
  return io;
}

// ── Redis subscriber setup ──────────────────────────────────────
async function setupRedisSubscriber() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log("[WS] ⚠ Žádné REDIS_URL — pouze in-process events (single instance)");
    return;
  }

  try {
    // Dynamic import so it doesn't fail if ioredis isn't available
    const { default: Redis } = await import("ioredis");

    const subscriber = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        if (times > 10) return null;
        return Math.min(times * 500, 5000);
      },
      ...(redisUrl.startsWith("rediss://") ? { tls: {} } : {}),
    });

    subscriber.subscribe(REDIS_CHANNEL, (err) => {
      if (err) {
        console.error("[WS] ✖ Redis subscribe selhal:", err);
      } else {
        console.log(`[WS] ✔ Redis subscriber aktivní — kanál: ${REDIS_CHANNEL}`);
      }
    });

    subscriber.on("message", (_channel, message) => {
      try {
        const event = JSON.parse(message);
        broadcastEvent(event);
      } catch (err) {
        console.error("[WS] ✖ Chyba parsování Redis zprávy:", err);
      }
    });

    subscriber.on("error", (err) => {
      console.error("[WS] ✖ Redis subscriber error:", err.message);
    });
  } catch (err) {
    console.warn("[WS] ⚠ Redis subscriber nelze spustit:", err);
  }
}

/**
 * Broadcast a parsed event to Socket.IO clients.
 * Used both by Redis subscriber AND direct in-process emission.
 */
export function broadcastEvent(event: {
  type: string;
  target: string;
  payload: Record<string, unknown>;
  timestamp: number;
}) {
  if (!io) return;

  const { type, target, payload, timestamp } = event;

  if (target === "all") {
    io.emit(type, { ...payload, timestamp });
  } else {
    io.to(`user:${target}`).emit(type, { ...payload, timestamp });
  }
}
