"use server";

// ============================================================================
// Admin — Reward claim management (approve / cancel)
// ============================================================================

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendNotification } from "@/lib/notifications";
import { emitRealtimeEvent } from "@/lib/socket-server";

// ---------------------------------------------------------------------------
// Get all reward claims (admin view)
// ---------------------------------------------------------------------------

export async function getAllRewardClaims(statusFilter?: string) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "MANAGER") return [];

  return prisma.rewardClaim.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    include: {
      reward: {
        select: { name: true, pointsCost: true, imageUrl: true },
      },
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Approve (fulfill) a reward claim
// ---------------------------------------------------------------------------

export async function fulfillRewardClaim(claimId: string) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "MANAGER") return { error: "Nedostatečná oprávnění" };

  const claim = await prisma.rewardClaim.findUnique({
    where: { id: claimId },
    include: { reward: { select: { name: true } } },
  });

  if (!claim) return { error: "Žádost nenalezena" };
  if (claim.status !== "PENDING") return { error: "Žádost již byla vyřízena" };

  await prisma.rewardClaim.update({
    where: { id: claimId },
    data: { status: "FULFILLED" },
  });

  // Notify the user
  await sendNotification({
    userId: claim.userId,
    type: "POINTS_RECEIVED",
    title: "Odměna schválena! 🎉",
    body: `Vaše odměna „${claim.reward.name}" byla schválena a je připravena k vyzvednutí.`,
    link: "/rewards",
  });
  emitRealtimeEvent("reward:update", claim.userId, {
    action: "fulfilled",
  }).catch(() => {});
  revalidatePath("/admin");
  revalidatePath("/rewards");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Cancel / reject a reward claim (refund points + restore stock)
// ---------------------------------------------------------------------------

export async function cancelRewardClaim(claimId: string) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "MANAGER") return { error: "Nedostatečná oprávnění" };

  const claim = await prisma.rewardClaim.findUnique({
    where: { id: claimId },
    include: { reward: { select: { name: true, pointsCost: true, stock: true } } },
  });

  if (!claim) return { error: "Žádost nenalezena" };
  if (claim.status !== "PENDING") return { error: "Žádost již byla vyřízena" };

  // Atomic: cancel claim + refund points + restore stock
  await prisma.$transaction([
    prisma.rewardClaim.update({
      where: { id: claimId },
      data: { status: "CANCELLED" },
    }),
    // Refund points to user
    prisma.user.update({
      where: { id: claim.userId },
      data: { pointsBalance: { increment: claim.reward.pointsCost } },
    }),
    // Restore stock (only if not unlimited)
    ...(claim.reward.stock >= 0
      ? [
          prisma.reward.update({
            where: { id: claim.rewardId },
            data: { stock: { increment: 1 } },
          }),
        ]
      : []),
    // Create refund transaction
    prisma.pointTransaction.create({
      data: {
        amount: claim.reward.pointsCost,
        reason: `Vrácení bodů – zamítnutí odměny „${claim.reward.name}"`,
        category: "REFUND",
        userId: claim.userId,
      },
    }),
  ]);

  // Notify user
  await sendNotification({
    userId: claim.userId,
    type: "POINTS_RECEIVED",
    title: "Odměna zamítnuta",
    body: `Vaše žádost o odměnu „${claim.reward.name}" byla zamítnuta. Body (${claim.reward.pointsCost}) byly vráceny.`,
    link: "/rewards",
  });
  emitRealtimeEvent("reward:update", claim.userId, {
    action: "cancelled",
  }).catch(() => {});
  emitRealtimeEvent("points:updated", claim.userId, {
    action: "refunded",
  }).catch(() => {});
  revalidatePath("/admin");
  revalidatePath("/rewards");
  return { success: true };
}
