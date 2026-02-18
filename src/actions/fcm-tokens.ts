"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const registerTokenSchema = z.object({
  token: z.string().min(10, "Neplatný FCM token").max(500),
  deviceType: z.enum(["WEB", "ANDROID", "IOS"]).default("WEB"),
  deviceName: z.string().max(100).optional(),
});

const deactivateTokenSchema = z.object({
  token: z.string().min(10, "Neplatný FCM token").max(500),
});

/**
 * Register or update an FCM token for the current user.
 *
 * IMPORTANT: Before upserting the new token we deactivate ALL other active
 * tokens for the same user + deviceType combination. On iOS (and sometimes on
 * web) FCM tokens rotate silently — the old token stays in the DB as active
 * even though it now points to the same physical device as the new token.
 * If the backend then sends a push to both the old AND new token, the device
 * receives the notification **twice**. Deactivating stale tokens prevents this.
 */
export async function registerFcmToken(
  token: string,
  deviceType: "WEB" | "ANDROID" | "IOS" = "WEB",
  deviceName?: string,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };

  const parsed = registerTokenSchema.safeParse({ token, deviceType, deviceName });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    // Deactivate all OTHER active tokens for the same user + deviceType.
    // This prevents duplicate pushes caused by token rotation on iOS/web
    // where the old token still belongs to the same physical device.
    const deactivated = await prisma.fcmToken.updateMany({
      where: {
        userId: session.user.id,
        deviceType: parsed.data.deviceType,
        isActive: true,
        token: { not: parsed.data.token },
      },
      data: { isActive: false },
    });

    if (deactivated.count > 0) {
      console.log(
        `[FCM:STATUS] 🗑 Deaktivováno ${deactivated.count} starých tokenů pro ${parsed.data.deviceType} | user=${session.user.id}`,
      );
    }

    // Upsert — if the token already exists, just update ownership/active flag
    const result = await prisma.fcmToken.upsert({
      where: { token: parsed.data.token },
      update: {
        userId: session.user.id,
        deviceType: parsed.data.deviceType,
        deviceName: parsed.data.deviceName ?? null,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        token: parsed.data.token,
        userId: session.user.id,
        deviceType: parsed.data.deviceType,
        deviceName: parsed.data.deviceName ?? null,
      },
    });

    console.log(
      `[FCM:STATUS] ✔ Token registrován | user=${session.user.id} | device=${parsed.data.deviceType} | name="${parsed.data.deviceName ?? "??"}" | tokenId=${result.id} | token=...${parsed.data.token.slice(-8)}`,
    );

    return { success: true };
  } catch (error) {
    console.error("[FCM:STATUS] ✖ Registrace tokenu selhala:", error);
    return { error: "Registrace notifikací dočasně selhala" };
  }
}

/**
 * Deactivate an FCM token (e.g., on logout or permission revoke).
 * Only the token owner can deactivate their own tokens.
 */
export async function deactivateFcmToken(token: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };

  const parsed = deactivateTokenSchema.safeParse({ token });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    // Only deactivate tokens owned by the current user
    const updated = await prisma.fcmToken.updateMany({
      where: {
        token: parsed.data.token,
        userId: session.user.id,
      },
      data: { isActive: false },
    });
    console.log(
      `[FCM:STATUS] 🗑 Token deaktivován | user=${session.user.id} | count=${updated.count} | token=...${parsed.data.token.slice(-8)}`,
    );
  } catch {
    // Token may not exist — ignore
  }
  return { success: true };
}
