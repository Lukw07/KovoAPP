/**
 * Standalone Socket.IO server for KOVO Apka.
 *
 * Runs alongside the Next.js app on a separate port (default 3001).
 * Subscribes to Redis pub/sub for realtime events from server actions
 * and broadcasts them to connected clients via WebSocket.
 *
 * Usage:
 *   npx tsx scripts/socket-server.ts
 *
 * Environment:
 *   SOCKET_PORT=3001 (default)
 *   REDIS_URL=redis://localhost:6379
 *   NEXT_PUBLIC_SOCKET_URL=http://localhost:3001 (client connects here)
 */

import { createServer } from "http";
import { Server } from "socket.io";
import Redis from "ioredis";

const PORT = parseInt(process.env.SOCKET_PORT || "3001", 10);
const REDIS_URL = process.env.REDIS_URL;
const REDIS_CHANNEL = "kovo:realtime";
const ALLOWED_ORIGINS = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// ── HTTP server ──────────────────────────────────────────────────
const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", connections: io.engine.clientsCount }));
    return;
  }
  res.writeHead(404);
  res.end();
});

// ── Socket.IO server ─────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS.split(","),
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingInterval: 25000,
  pingTimeout: 20000,
});

// ── Connection handling ──────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // Client sends their user ID after connecting
  socket.on("auth", (userId: string) => {
    if (userId && typeof userId === "string") {
      socket.join(`user:${userId}`);
      socket.data.userId = userId;
      console.log(`[WS] User ${userId} joined room user:${userId}`);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`[WS] Client disconnected: ${socket.id} (${reason})`);
  });
});

// ── Redis subscription ───────────────────────────────────────────
if (REDIS_URL) {
  const subscriber = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      if (times > 10) return null;
      return Math.min(times * 500, 5000);
    },
    ...(REDIS_URL.startsWith("rediss://") ? { tls: {} } : {}),
  });

  subscriber.subscribe(REDIS_CHANNEL, (err) => {
    if (err) {
      console.error("[WS] Redis subscribe failed:", err);
    } else {
      console.log(`[WS] Subscribed to Redis channel: ${REDIS_CHANNEL}`);
    }
  });

  subscriber.on("message", (_channel, message) => {
    try {
      const event = JSON.parse(message);
      const { type, target, payload, timestamp } = event;

      if (target === "all") {
        // Broadcast to everyone
        io.emit(type, { ...payload, timestamp });
      } else {
        // Send to specific user room
        io.to(`user:${target}`).emit(type, { ...payload, timestamp });
      }
    } catch (err) {
      console.error("[WS] Failed to parse Redis message:", err);
    }
  });

  subscriber.on("error", (err) => {
    console.error("[WS] Redis subscriber error:", err.message);
  });

  console.log("[WS] Redis subscriber configured");
} else {
  console.warn("[WS] No REDIS_URL — running without Redis pub/sub (single-instance only)");
}

// ── Start ────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`[WS] Socket.IO server running on port ${PORT}`);
  console.log(`[WS] CORS: ${ALLOWED_ORIGINS}`);
});

// ── Graceful shutdown ────────────────────────────────────────────
process.on("SIGTERM", () => {
  console.log("[WS] Shutting down...");
  io.close();
  httpServer.close();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[WS] Shutting down...");
  io.close();
  httpServer.close();
  process.exit(0);
});
