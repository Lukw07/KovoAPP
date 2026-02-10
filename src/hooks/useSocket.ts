"use client";

/**
 * Socket.IO client hook for realtime events.
 *
 * Connects to the standalone Socket.IO server and provides:
 * - Auto-connect with authentication (sends user ID)
 * - Event subscription with cleanup
 * - Connection status
 * - Auto-reconnection
 *
 * Usage:
 *   const { on, isConnected } = useSocket();
 *   useEffect(() => on("notification:new", (data) => { ... }), [on]);
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

/**
 * Auto-detect socket URL:
 * - If NEXT_PUBLIC_SOCKET_URL is set, use it
 * - Otherwise derive from current page hostname + port 3001
 *   (works in Docker, VPS, localhost — no manual config needed)
 */
function getSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "https" : "http";
    return `${proto}://${window.location.hostname}:3001`;
  }
  return "http://localhost:3001";
}

let globalSocket: Socket | null = null;
let connectionCount = 0;

function getSocket(): Socket {
  if (!globalSocket) {
    const url = getSocketUrl();
    globalSocket = io(url, {
      transports: ["websocket", "polling"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });
  }
  return globalSocket;
}

export function useSocket() {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const authenticatedRef = useRef(false);
  const userId = session?.user?.id;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const socket = getSocket();
    connectionCount++;

    function onConnect() {
      setIsConnected(true);
      // Authenticate with user ID
      if (userId && !authenticatedRef.current) {
        socket.emit("auth", userId);
        authenticatedRef.current = true;
      }
    }

    function onDisconnect() {
      setIsConnected(false);
      authenticatedRef.current = false;
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // Connect if not already
    if (!socket.connected) {
      socket.connect();
    } else {
      setIsConnected(true);
      if (userId && !authenticatedRef.current) {
        socket.emit("auth", userId);
        authenticatedRef.current = true;
      }
    }

    return () => {
      connectionCount--;
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);

      // Only disconnect if no more consumers
      if (connectionCount <= 0) {
        socket.disconnect();
        globalSocket = null;
        connectionCount = 0;
      }
    };
  }, [userId]);

  // Re-authenticate when user changes
  useEffect(() => {
    if (!userId || !isConnected) return;
    const socket = getSocket();
    socket.emit("auth", userId);
    authenticatedRef.current = true;
  }, [userId, isConnected]);

  /**
   * Subscribe to a realtime event. Returns an unsubscribe function.
   */
  const on = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: string, handler: (data: any) => void): (() => void) => {
      const socket = getSocket();
      socket.on(event, handler);
      return () => {
        socket.off(event, handler);
      };
    },
    [],
  );

  /**
   * Emit an event to the server.
   */
  const emit = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: string, data?: any) => {
      const socket = getSocket();
      if (socket.connected) {
        socket.emit(event, data);
      }
    },
    [],
  );

  return { isConnected, on, emit };
}
