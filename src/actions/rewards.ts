"use server";

// ============================================================================
// Rewards — Server Actions (claim a reward, deduct points)
// ============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { emitRealtimeEvent } from "@/lib/socket-server";

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const claimRewardSchema = z.object({
  rewardId: z.string().cuid("Neplatné ID odměny"),
});

// ---------------------------------------------------------------------------
// claimReward — User spends points to claim a reward
// ---------------------------------------------------------------------------

export async function claimReward(rewardId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };

  const parsed = claimRewardSchema.safeParse({ rewardId });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const userId = session.user.id;

  try {
    // Fetch reward and user balance in parallel
    const [reward, user] = await Promise.all([
      prisma.reward.findUnique({ where: { id: rewardId } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { pointsBalance: true },
      }),
    ]);

    if (!reward || !reward.isActive) {
      return { error: "Tato odměna není dostupná" };
    }

    if (!user) {
      return { error: "Uživatel nenalezen" };
    }

    if (user.pointsBalance < reward.pointsCost) {
      return {
        error: `Nemáte dostatek bodů. Potřebujete ${reward.pointsCost}, máte ${user.pointsBalance}.`,
      };
    }

    if (reward.stock === 0) {
      return { error: "Tato odměna je vyprodaná" };
    }

    // Atomic transaction: create claim + deduct points + decrease stock
    await prisma.$transaction([
      // Create the claim
      prisma.rewardClaim.create({
        data: {
          userId,
          rewardId: reward.id,
          status: "PENDING",
        },
      }),
      // Create a point transaction (negative = spent)
      prisma.pointTransaction.create({
        data: {
          amount: -reward.pointsCost,
          reason: `Uplatnění odměny: ${reward.name}`,
          category: "reward_claim",
          userId,
        },
      }),
      // Deduct points from user balance
      prisma.user.update({
        where: { id: userId },
        data: { pointsBalance: { decrement: reward.pointsCost } },
      }),
      // Decrease stock if not unlimited (-1 = unlimited)
      ...(reward.stock > 0
        ? [
            prisma.reward.update({
              where: { id: reward.id },
              data: { stock: { decrement: 1 } },
            }),
          ]
        : []),
    ]);

    revalidatePath("/rewards");
    revalidatePath("/dashboard");

    emitRealtimeEvent("reward:update", "all", {
      action: "claimed",
    }).catch(() => {});
    emitRealtimeEvent("points:updated", userId, {
      action: "reward_claimed",
    }).catch(() => {});

    await logAudit({
      action: "REWARD_CLAIMED",
      entityType: "Reward",
      entityId: reward.id,
      performedBy: userId,
      details: { rewardName: reward.name, pointsCost: reward.pointsCost },
    });

    return { success: true };
  } catch (err) {
    console.error("claimReward error:", err);
    return { error: "Nepodařilo se uplatnit odměnu. Zkuste to znovu." };
  }
}
