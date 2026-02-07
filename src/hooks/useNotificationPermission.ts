"use client";

import { useState, useEffect, useCallback } from "react";
import { getToken } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebase";
import { registerFcmToken, deactivateFcmToken } from "@/actions/fcm-tokens";

type PermissionState = "default" | "granted" | "denied" | "unsupported" | "loading";

interface NotificationPermissionResult {
  /** Current permission state */
  permission: PermissionState;
  /** Whether the device supports push notifications */
  isSupported: boolean;
  /** Whether running as standalone PWA (added to home screen) */
  isStandalone: boolean;
  /** Whether this is an iOS device */
  isIOS: boolean;
  /** Whether user should be prompted to add to home screen first (iOS Safari) */
  shouldPromptA2HS: boolean;
  /** Request permission and register FCM token */
  requestPermission: () => Promise<void>;
  /** Whether a request is in progress */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Hook that handles:
 * 1. Checking notification support
 * 2. iOS "Add to Home Screen" detection/prompting
 * 3. Requesting notification permission
 * 4. Registering the FCM token with the server
 */
export function useNotificationPermission(): NotificationPermissionResult {
  const [permission, setPermission] = useState<PermissionState>("loading");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Detect environment on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // iOS detection
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    // Standalone PWA detection (works for iOS and Android)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error — iOS Safari proprietary
      window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Check notification support
    const hasNotificationAPI = "Notification" in window;
    const hasServiceWorker = "serviceWorker" in navigator;
    setIsSupported(hasNotificationAPI && hasServiceWorker);

    if (hasNotificationAPI) {
      setPermission(Notification.permission as PermissionState);
    } else {
      setPermission("unsupported");
    }
  }, []);

  // iOS in Safari (not standalone) can't do push — need A2HS first
  const shouldPromptA2HS = isIOS && !isStandalone;

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      setError("Tento prohlížeč nepodporuje push notifikace");
      return;
    }

    if (shouldPromptA2HS) {
      setError(
        'Pro push notifikace na iOS nejdříve přidejte aplikaci na plochu: Sdílet → "Přidat na plochu"',
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result !== "granted") {
        setError("Notifikace nebyly povoleny");
        setIsLoading(false);
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
        { scope: "/" },
      );

      // Wait for SW to be ready
      await navigator.serviceWorker.ready;

      // Pass Firebase config to SW
      if (registration.active) {
        registration.active.postMessage({
          type: "FIREBASE_CONFIG",
          config: {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
          },
        });
      }

      // Get FCM token
      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        setError("Firebase Messaging není dostupné");
        setIsLoading(false);
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      const fcmToken = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (!fcmToken) {
        setError("Nepodařilo se získat token pro notifikace");
        setIsLoading(false);
        return;
      }

      // Detect device type
      const deviceType = isIOS ? "IOS" : "WEB";
      const deviceName = `${navigator.userAgent.slice(0, 50)}`;

      // Register with server
      const result2 = await registerFcmToken(fcmToken, deviceType, deviceName);
      if (result2.error) {
        setError(result2.error);
      }
    } catch (err) {
      console.error("[useNotificationPermission]", err);
      setError("Chyba při nastavování notifikací");
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, shouldPromptA2HS, isIOS]);

  return {
    permission,
    isSupported,
    isStandalone,
    isIOS,
    shouldPromptA2HS,
    requestPermission,
    isLoading,
    error,
  };
}
