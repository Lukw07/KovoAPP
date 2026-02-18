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
 * - On localhost/dev use hostname + port 3001
 * - On HTTPS production use same-origin (expects reverse proxy to /socket.io)
 */
function getSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname, origin } = window.location;
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

    // Local development: direct socket port is fine (no TLS)
    if (isLocalHost) {
      return `http://${hostname}:3001`;
    }

    // Production HTTPS: avoid direct :3001 because it is usually plain WS without TLS.
    // Use same-origin and let reverse proxy terminate TLS + forward websocket.
    if (protocol === "https:") {
      return origin;
    }

    // Non-HTTPS deployments can still use direct socket port.
    return `http://${hostname}:3001`;
  }

  return "http://localhost:3001";
}

let globalSocket: Socket | null = null;
let connectionCount = 0;
let connectErrorCount = 0;
let socketDisabledForSession = false;

const SOCKET_DISABLE_SESSION_KEY = "kovo:socket-disabled";
const MAX_CONNECT_ERRORS = 4;

function isSocketDisabled(): boolean {
  if (socketDisabledForSession) return true;
  if (typeof window === "undefined") return false;

  const disabled = window.sessionStorage.getItem(SOCKET_DISABLE_SESSION_KEY) === "1";
  if (disabled) {
    socketDisabledForSession = true;
  }
  return disabled;
}

function disableSocketForSession(): void {
  socketDisabledForSession = true;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(SOCKET_DISABLE_SESSION_KEY, "1");
  }
}

function getSocket(): Socket {
  if (!globalSocket) {
    const url = getSocketUrl();
    const path = process.env.NEXT_PUBLIC_SOCKET_PATH || "/socket.io";

    globalSocket = io(url, {
      path,
      transports: ["websocket", "polling"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 20,
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
    if (isSocketDisabled()) return;

    const socket = getSocket();
    connectionCount++;

    function onConnect() {
      connectErrorCount = 0;
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

    function onConnectError() {
      connectErrorCount += 1;

      if (connectErrorCount >= MAX_CONNECT_ERRORS) {
        disableSocketForSession();
        socket.io.opts.reconnection = false;
        socket.disconnect();
        setIsConnected(false);
      }
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    // Connect if not already
    if (!socket.connected && !isSocketDisabled()) {
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
      socket.off("connect_error", onConnectError);

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
    if (!userId || !isConnected || isSocketDisabled()) return;
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
      if (isSocketDisabled()) {
        return () => {};
      }

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
      if (isSocketDisabled()) return;

      const socket = getSocket();
      if (socket.connected) {
        socket.emit(event, data);
      }
    },
    [],
  );

  return { isConnected, on, emit };
}
