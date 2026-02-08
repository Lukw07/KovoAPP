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

  // Upsert — if the token already exists, just update ownership/active flag
  await prisma.fcmToken.upsert({
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

  return { success: true };
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
    await prisma.fcmToken.updateMany({
      where: {
        token: parsed.data.token,
        userId: session.user.id,
      },
      data: { isActive: false },
    });
  } catch {
    // Token may not exist — ignore
  }
  return { success: true };
}
