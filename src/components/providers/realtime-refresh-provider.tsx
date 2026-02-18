"use client";

/**
 * RealtimeRefreshProvider — centralized Socket.IO listener that automatically
 * refreshes the current page (re-runs RSC) whenever a relevant realtime event
 * arrives.
 *
 * Mounted once in the app layout. Listens to ALL event types and calls
 * `router.refresh()`, which re-fetches server components without a full page
 * reload. This gives every page instant live data without per-page wiring.
 */

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";

/** All event types that should trigger a page refresh */
const REFRESH_EVENTS = [
  "notification:new",
  "activity:new",
  "message:new",
  "poll:created",
  "poll:voted",
  "news:published",
  "points:updated",
  "hr:request_update",
  "reservation:update",
  "marketplace:update",
  "calendar:update",
  "reward:update",
] as const;

/** Debounce interval — if many events arrive at once, only refresh once */
const DEBOUNCE_MS = 300;

export function RealtimeRefreshProvider() {
  const router = useRouter();
  const pathname = usePathname();
  const { on } = useSocket();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shouldRefreshForEvent = useCallback(
    (event: (typeof REFRESH_EVENTS)[number]) => {
      if (pathname?.startsWith("/reservations")) {
        return event === "reservation:update";
      }
      return true;
    },
    [pathname],
  );

  useEffect(() => {
    const debouncedRefresh = (event: (typeof REFRESH_EVENTS)[number]) => {
      if (!shouldRefreshForEvent(event)) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        router.refresh();
      }, DEBOUNCE_MS);
    };

    const unsubscribers = REFRESH_EVENTS.map((event) =>
      on(event, () => debouncedRefresh(event)),
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [on, router, shouldRefreshForEvent]);

  return null;
}
