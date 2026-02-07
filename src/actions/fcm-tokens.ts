"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  // Upsert — if the token already exists, just update ownership/active flag
  await prisma.fcmToken.upsert({
    where: { token },
    update: {
      userId: session.user.id,
      deviceType,
      deviceName: deviceName ?? null,
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      token,
      userId: session.user.id,
      deviceType,
      deviceName: deviceName ?? null,
    },
  });

  return { success: true };
}

/**
 * Deactivate an FCM token (e.g., on logout or permission revoke).
 */
export async function deactivateFcmToken(token: string) {
  try {
    await prisma.fcmToken.update({
      where: { token },
      data: { isActive: false },
    });
  } catch {
    // Token may not exist — ignore
  }
  return { success: true };
}
