"use server";

// ============================================================================
// Rewards — Data Queries
// ============================================================================

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Get all active rewards for the shop
// ---------------------------------------------------------------------------

export async function getActiveRewards() {
  return prisma.reward.findMany({
    where: { isActive: true },
    orderBy: { pointsCost: "asc" },
  });
}

// ---------------------------------------------------------------------------
// Get user's reward claims history
// ---------------------------------------------------------------------------

export async function getMyRewardClaims() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.rewardClaim.findMany({
    where: { userId: session.user.id },
    include: {
      reward: {
        select: {
          name: true,
          description: true,
          pointsCost: true,
          imageUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
