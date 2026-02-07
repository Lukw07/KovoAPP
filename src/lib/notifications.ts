"use server";

/**
 * Push notifications module — persists in DB + dispatches via Firebase Cloud
 * Messaging to all of the user's registered devices.
 */

import type { NotificationType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getAdminMessaging } from "@/lib/firebase-admin";

interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

/**
 * Persist a notification record AND send a push notification via FCM.
 */
export async function sendNotification({
  userId,
  type,
  title,
  body,
  link,
}: SendNotificationParams) {
  // 1. Persist in DB
  await prisma.notification.create({
    data: { userId, type, title, body, link },
  });

  // 2. Send push via FCM to all active tokens
  await sendPushToUser(userId, title, body, link);

  console.log(`[NOTIFICATION] → ${userId} | ${type} | ${title}: ${body}`);
}

/**
 * Send push notification to ALL active FCM tokens for a specific user.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  link?: string,
) {
  const messaging = getAdminMessaging();
  if (!messaging) return; // Firebase not configured — silent fallback

  const tokens = await prisma.fcmToken.findMany({
    where: { userId, isActive: true },
    select: { token: true, id: true },
  });

  if (tokens.length === 0) return;

  const tokenStrings = tokens.map((t) => t.token);

  try {
    const response = await messaging.sendEachForMulticast({
      tokens: tokenStrings,
      notification: { title, body },
      data: { link: link ?? "/dashboard", tag: "kovo-app" },
      webpush: {
        fcmOptions: { link: link ?? "/dashboard" },
        notification: {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
          vibrate: [200, 100, 200],
        },
      },
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
          `[FCM] Deactivated ${invalidTokenIds.length} invalid token(s)`,
        );
      }
    }
  } catch (err) {
    console.error("[FCM] Failed to send push:", err);
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
  if (!messaging) return;

  const allTokens = await prisma.fcmToken.findMany({
    where: { isActive: true },
    select: { token: true, id: true },
  });

  if (allTokens.length === 0) return;

  // FCM multicast supports max 500 tokens per call
  const BATCH_SIZE = 500;
  for (let i = 0; i < allTokens.length; i += BATCH_SIZE) {
    const batch = allTokens.slice(i, i + BATCH_SIZE);
    const tokenStrings = batch.map((t) => t.token);

    try {
      const response = await messaging.sendEachForMulticast({
        tokens: tokenStrings,
        notification: { title, body },
        data: { link: link ?? "/dashboard", tag: "kovo-broadcast" },
        webpush: {
          fcmOptions: { link: link ?? "/dashboard" },
          notification: {
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-72x72.png",
            vibrate: [200, 100, 200],
          },
        },
      });

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
        }
      }
    } catch (err) {
      console.error(`[FCM] Broadcast batch ${i} failed:`, err);
    }
  }

  console.log(
    `[FCM] Broadcast sent to ${allTokens.length} device(s): ${title}`,
  );
}
