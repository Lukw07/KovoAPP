"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Get notifications for the current user.
 */
export async function getMyNotifications(limit = 20) {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Get the unread notification count for the current user.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) return 0;

  return prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  });
}

/**
 * Mark a single notification as read — deletes it from DB.
 */
export async function markNotificationRead(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.notification.deleteMany({
    where: { id: notificationId, userId: session.user.id },
  });
}

/**
 * Mark all notifications as read — deletes all for the current user.
 */
export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.notification.deleteMany({
    where: { userId: session.user.id },
  });
}
