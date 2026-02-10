"use client";

import { useEffect, useRef, useCallback } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebase";
import { registerFcmToken } from "@/actions/fcm-tokens";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

/**
 * FCM Provider — handles two critical tasks:
 *
 * 1. **Foreground message listener** (`onMessage`) — shows a toast notification
 *    when a push message arrives while the app is in the foreground.
 *    Without this, FCM messages are silently swallowed when the tab is focused.
 *
 * 2. **Auto-token registration** — if the user has already granted notification
 *    permission, automatically registers/refreshes the FCM token on each session.
 *    This ensures tokens stay fresh and users don't silently lose push notifications.
 */
export function FcmProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const listenerSetUp = useRef(false);
  const tokenRegistered = useRef(false);

  // ── Auto-register FCM token for users who already granted permission ──
  const autoRegisterToken = useCallback(async () => {
    if (tokenRegistered.current) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    // Respect manual unsubscribe
    if (localStorage.getItem("fcm-unsubscribed") === "true") return;

    try {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;

      // Ensure service worker is registered
      let registration = await navigator.serviceWorker.getRegistration("/");
      if (!registration) {
        registration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js",
          { scope: "/" }
        );
        await navigator.serviceWorker.ready;
      }

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.warn("[FCM:KLIENT] ⚠ NEXT_PUBLIC_FIREBASE_VAPID_KEY není nastaven — push notifikace nebudou fungovat");
        return;
      }

      const fcmToken = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (fcmToken) {
        const isIOS =
          /iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        const deviceType = isIOS ? "IOS" : "WEB";
        const deviceName = navigator.userAgent.slice(0, 50);

        console.log(`[FCM:KLIENT] ▶ Registruji token | device=${deviceType} | token=...${fcmToken.slice(-8)}`);
        await registerFcmToken(fcmToken, deviceType, deviceName);
        tokenRegistered.current = true;
        console.log(`[FCM:KLIENT] ✔ Token registrován na serveru | device=${deviceType}`);
      } else {
        console.warn("[FCM:KLIENT] ⚠ getToken vrátil prázdný token — push nebudou fungovat");
      }
    } catch (err) {
      console.error("[FCM:KLIENT] ✖ Auto-registrace selhala:", err);
    }
  }, []);

  // ── Setup foreground message listener ──
  const setupForegroundListener = useCallback(async () => {
    if (listenerSetUp.current) return;
    if (typeof window === "undefined") return;

    try {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;

      onMessage(messaging, (payload) => {
        // Data-only FCM messages put everything in `data`, not `notification`
        const title = payload.data?.title || payload.notification?.title || "KOVO Apka";
        const body = payload.data?.body || payload.notification?.body || "";
        const link = payload.data?.link || "/dashboard";

        console.log("[FCM:KLIENT] ✔ Foreground zpráva přijata:", { title, body, link });

        // Show in-app toast notification (only this — no native Notification
        // to avoid duplicates; foreground = toast is enough)
        toast(title, {
          description: body,
          duration: 6000,
          action: link !== "/dashboard"
            ? {
                label: "Zobrazit",
                onClick: () => {
                  window.location.href = link;
                },
              }
            : undefined,
        });
      });

      listenerSetUp.current = true;
      console.log("[FCM:KLIENT] ✔ Foreground listener aktivní — push notifikace budou zobrazovány");
    } catch (err) {
      console.error("[FCM:KLIENT] ✖ Foreground listener selhal:", err);
    }
  }, []);

  useEffect(() => {
    // Only run when user is authenticated
    if (!session?.user?.id) return;

    autoRegisterToken();
    setupForegroundListener();
  }, [session?.user?.id, autoRegisterToken, setupForegroundListener]);

  return <>{children}</>;
}
