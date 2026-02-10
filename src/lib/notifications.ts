import "server-only";

/**
 * Push notifications module — persists in DB + dispatches via Firebase Cloud
 * Messaging to all of the user's registered devices + emits realtime Socket.IO events.
 */

import type { NotificationType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getAdminMessaging } from "@/lib/firebase-admin";
import { emitRealtimeEvent } from "@/lib/socket-server";

interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

/**
 * Persist a notification record AND send a push notification via FCM.
 * Also emits a realtime event via Socket.IO so connected clients update instantly.
 */
export async function sendNotification({
  userId,
  type,
  title,
  body,
  link,
}: SendNotificationParams) {
  console.log(`[FCM:STATUS] ▶ Vytvářím notifikaci | user=${userId} | type=${type} | title="${title}"`);

  // 1. Persist in DB
  const notification = await prisma.notification.create({
    data: { userId, type, title, body, link },
  });
  console.log(`[FCM:STATUS] ✔ Notifikace uložena do DB | id=${notification.id}`);

  // 2. Send push via FCM to all active tokens
  // Pass notification.id as tag — ensures identical pushes (e.g. delivered to
  // multiple tokens of the same device) collapse into ONE notification on the
  // device, while different notifications each get their own slot.
  await sendPushToUser(userId, title, body, link, notification.id);

  // 3. Emit realtime event for Socket.IO clients (instant badge update)
  emitRealtimeEvent("notification:new", userId, { title, body, link, type }).catch(
    (err) => console.error("[FCM:STATUS] ✘ Realtime emit selhal:", err),
  );

  console.log(`[FCM:STATUS] ✔ Notifikace kompletní | user=${userId} | type=${type}`);
}

/**
 * Send push notification to ALL active FCM tokens for a specific user.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  link?: string,
  notificationTag?: string,
) {
  const messaging = getAdminMessaging();
  if (!messaging) {
    console.warn(`[FCM:STATUS] ⚠ Firebase Admin není nastavený — push přeskočen | user=${userId}`);
    return;
  }

  const tokens = await prisma.fcmToken.findMany({
    where: { userId, isActive: true },
    select: { token: true, id: true, deviceType: true, deviceName: true },
  });

  if (tokens.length === 0) {
    console.warn(`[FCM:STATUS] ⚠ Žádné aktivní tokeny pro user=${userId} — push nelze odeslat`);
    return;
  }

  console.log(`[FCM:STATUS] ▶ Odesílám push na ${tokens.length} zařízení | user=${userId} | devices=[${tokens.map(t => `${t.deviceType}:${t.deviceName ?? "?"}`).join(", ")}]`);

  const tokenStrings = tokens.map((t) => t.token);

  try {
    // Data-only message — no `notification` field!
    // This ensures onMessage (foreground) and onBackgroundMessage (background)
    // are ALWAYS called, giving us full control. With a `notification` field,
    // the browser auto-displays a native notification AND our handlers fire,
    // causing duplicates.
    const response = await messaging.sendEachForMulticast({
      tokens: tokenStrings,
      data: {
        title,
        body,
        link: link ?? "/dashboard",
        tag: notificationTag ?? `kovo-${Date.now()}`,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
      },
    });

    console.log(`[FCM:STATUS] ✔ Push odeslán | user=${userId} | úspěšné=${response.successCount} | neúspěšné=${response.failureCount}`);

    // Log individual results
    response.responses.forEach((resp, idx) => {
      if (resp.success) {
        console.log(`[FCM:STATUS]   └ ✔ Token #${idx + 1} (${tokens[idx].deviceType}) — doručeno (messageId: ${resp.messageId})`);
      } else {
        console.warn(`[FCM:STATUS]   └ ✘ Token #${idx + 1} (${tokens[idx].deviceType}) — CHYBA: ${resp.error?.code} (${resp.error?.message})`);
      }
    });

    // Deactivate any invalid tokens
    if (response.failureCount > 0) {
      const invalidTokenIds: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (
          !resp.success &&
          resp.error?.code &&
          [
            "messaging/invalid-registration-token",
            "messaging/registration-token-not-registered",
          ].includes(resp.error.code)
        ) {
          invalidTokenIds.push(tokens[idx].id);
        }
      });

      if (invalidTokenIds.length > 0) {
        await prisma.fcmToken.updateMany({
          where: { id: { in: invalidTokenIds } },
          data: { isActive: false },
        });
        console.log(
          `[FCM:STATUS] 🗑 Deaktivováno ${invalidTokenIds.length} neplatných tokenů`,
        );
      }
    }
  } catch (err) {
    console.error(`[FCM:STATUS] ✘ Push selhal | user=${userId} | error:`, err);
  }
}

/**
 * Send push notification to ALL users (topic-like broadcast).
 * Fetches all active FCM tokens and sends in batches.
 */
export async function sendPushToAll(
  title: string,
  body: string,
  link?: string,
) {
  const messaging = getAdminMessaging();
  if (!messaging) {
    console.warn(`[FCM:STATUS] ⚠ Firebase Admin není nastavený — broadcast přeskočen | title="${title}"`);
    return;
  }

  const allTokens = await prisma.fcmToken.findMany({
    where: { isActive: true },
    select: { token: true, id: true },
  });

  if (allTokens.length === 0) {
    console.warn(`[FCM:STATUS] ⚠ Žádné aktivní tokeny — broadcast nelze odeslat | title="${title}"`);
    return;
  }

  console.log(`[FCM:STATUS] ▶ Broadcast push na ${allTokens.length} zařízení | title="${title}"`);

  let totalSuccess = 0;
  let totalFail = 0;

  // FCM multicast supports max 500 tokens per call
  const BATCH_SIZE = 500;
  for (let i = 0; i < allTokens.length; i += BATCH_SIZE) {
    const batch = allTokens.slice(i, i + BATCH_SIZE);
    const tokenStrings = batch.map((t) => t.token);

    try {
      const response = await messaging.sendEachForMulticast({
        tokens: tokenStrings,
        data: {
          title,
          body,
          link: link ?? "/dashboard",
          tag: `kovo-broadcast-${Date.now()}`,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
        },
      });

      totalSuccess += response.successCount;
      totalFail += response.failureCount;

      console.log(`[FCM:STATUS]   └ Batch ${Math.floor(i / BATCH_SIZE) + 1}: úspěšné=${response.successCount} neúspěšné=${response.failureCount}`);

      // Clean up invalid tokens
      if (response.failureCount > 0) {
        const invalidIds: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (
            !resp.success &&
            resp.error?.code &&
            [
              "messaging/invalid-registration-token",
              "messaging/registration-token-not-registered",
            ].includes(resp.error.code)
          ) {
            invalidIds.push(batch[idx].id);
          }
        });

        if (invalidIds.length > 0) {
          await prisma.fcmToken.updateMany({
            where: { id: { in: invalidIds } },
            data: { isActive: false },
          });
          console.log(`[FCM:STATUS]   └ 🗑 Deaktivováno ${invalidIds.length} neplatných tokenů`);
        }
      }
    } catch (err) {
      console.error(`[FCM:STATUS] ✘ Broadcast batch ${Math.floor(i / BATCH_SIZE) + 1} selhal:`, err);
    }
  }

  console.log(
    `[FCM:STATUS] ✔ Broadcast kompletní | celkem=${allTokens.length} | úspěšné=${totalSuccess} | neúspěšné=${totalFail} | title="${title}"`,
  );
}
