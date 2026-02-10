"use server";

// ============================================================================
// Gamification — Points Server Actions
// ============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { emitRealtimeEvent } from "@/lib/socket-server";

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const givePointsSchema = z.object({
  userId: z.string().min(1, "Vyberte uživatele"),
  amount: z.coerce.number().int().min(1, "Minimálně 1 bod").max(10000),
  reason: z.string().min(3, "Uveďte důvod (min. 3 znaky)").max(500),
  category: z.string().optional(),
});

const deductPointsSchema = z.object({
  userId: z.string().min(1, "Vyberte uživatele"),
  amount: z.coerce.number().int().min(1, "Minimálně 1 bod").max(10000),
  reason: z.string().min(3, "Uveďte důvod (min. 3 znaky)").max(500),
  category: z.string().optional(),
});

// ---------------------------------------------------------------------------
// givePoints — Admin/Manager awards points to a user
// ---------------------------------------------------------------------------

export async function givePoints(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return { error: "Nemáte oprávnění udělovat body" };
  }

  const parsed = givePointsSchema.safeParse({
    userId: formData.get("userId"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
    category: formData.get("category") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { userId, amount, reason, category } = parsed.data;

  // Don't allow giving points to yourself
  if (userId === session.user.id) {
    return { error: "Nemůžete udělovat body sami sobě" };
  }

  try {
    // Create transaction + update balance atomically
    const [, updatedUser] = await prisma.$transaction([
      prisma.pointTransaction.create({
        data: {
          amount,
          reason,
          category: category || null,
          userId,
          adminId: session.user.id,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { pointsBalance: { increment: amount } },
        select: { pointsBalance: true },
      }),
    ]);

    await logAudit({
      action: "POINTS_AWARDED",
      entityType: "PointTransaction",
      entityId: userId,
      performedBy: session.user.id,
      details: { amount, reason, category },
    });

    // Send push notification to the recipient
    await sendNotification({
      userId,
      type: "POINTS_RECEIVED",
      title: `Získali jste ${amount} bodů! 🎉`,
      body: reason,
      link: "/rewards",
    });

    // Realtime points balance update
    emitRealtimeEvent("points:updated", userId, {
      balance: updatedUser.pointsBalance,
      amount,
      reason,
      newAction: "award",
    }).catch(() => {});

    revalidatePath("/rewards");
    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("givePoints error:", err);
    return { error: "Nepodařilo se udělit body" };
  }
}

// ---------------------------------------------------------------------------
// deductPoints — Admin deducts points from a user
// ---------------------------------------------------------------------------

export async function deductPoints(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };
  if (session.user.role !== "ADMIN") {
    return { error: "Pouze admin může odečítat body" };
  }

  const parsed = deductPointsSchema.safeParse({
    userId: formData.get("userId"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
    category: formData.get("category") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { userId, amount, reason, category } = parsed.data;

  try {
    await prisma.$transaction([
      prisma.pointTransaction.create({
        data: {
          amount: -amount,
          reason,
          category: category || null,
          userId,
          adminId: session.user.id,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { pointsBalance: { decrement: amount } },
      }),
    ]);

    // Read current balance for realtime update
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true },
    });

    await logAudit({
      action: "POINTS_DEDUCTED",
      entityType: "PointTransaction",
      entityId: userId,
      performedBy: session.user.id,
      details: { amount, reason, category },
    });

    await sendNotification({
      userId,
      type: "POINTS_DEDUCTED",
      title: `Odečteno ${amount} bodů`,
      body: reason,
      link: "/rewards",
    });

    // Realtime points balance update
    emitRealtimeEvent("points:updated", userId, {
      balance: updatedUser?.pointsBalance ?? 0,
      amount: -amount,
      reason,
      newAction: "deduct",
    }).catch(() => {});

    revalidatePath("/rewards");
    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("deductPoints error:", err);
    return { error: "Nepodařilo se odečíst body" };
  }
}

// ---------------------------------------------------------------------------
// getRecentTransactions — Recent point transactions for management view
// ---------------------------------------------------------------------------

export async function getRecentTransactions(limit = 20) {
  const session = await auth();
  if (!session?.user?.id) return [];
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return [];
  }

  return prisma.pointTransaction.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      amount: true,
      reason: true,
      category: true,
      createdAt: true,
      user: {
        select: { id: true, name: true, avatarUrl: true, position: true },
      },
      admin: {
        select: { id: true, name: true },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// getActiveUsersForPoints — Simple user list for autocomplete
// ---------------------------------------------------------------------------

export async function getActiveUsersForPoints() {
  const session = await auth();
  if (!session?.user?.id) return [];
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return [];
  }

  return prisma.user.findMany({
    where: { isActive: true, id: { not: session.user.id } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      position: true,
      pointsBalance: true,
      department: { select: { name: true } },
    },
  });
}
