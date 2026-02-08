// Firebase Messaging Service Worker
// This file must be at the root of the public directory.
// It handles background push notifications when the app is not in focus.

/* eslint-disable no-undef */
// @ts-nocheck

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// These are PUBLIC Firebase keys — safe to expose in the service worker.
// They must match the values in .env.local (NEXT_PUBLIC_FIREBASE_*).
firebase.initializeApp({
  apiKey: "AIzaSyByu1QRURCXMSt69IS5DxMyVd7GduUrb8I",
  authDomain: "kovo-2544d.firebaseapp.com",
  projectId: "kovo-2544d",
  storageBucket: "kovo-2544d.firebasestorage.app",
  messagingSenderId: "374185364721",
  appId: "1:374185364721:web:955c0b46591cf84a346d50",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw] Background message:", payload);

  const notificationTitle = payload.notification?.title || "KOVO Apka";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: payload.data?.tag || "default",
    data: {
      url: payload.data?.link || "/dashboard",
    },
    // Vibrate pattern for manufacturing environment (stronger vibration)
    vibrate: [200, 100, 200],
    // Renotify if same tag
    renotify: true,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click — navigate to the deep link
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If an app window is already open, focus it and navigate
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
