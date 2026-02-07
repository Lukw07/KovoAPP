"use server";

// ============================================================================
// Gamification — Points Server Actions
// ============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

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
    await prisma.$transaction([
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
      }),
    ]);

    // Send push notification to the recipient
    await sendNotification({
      userId,
      type: "POINTS_RECEIVED",
      title: `Získali jste ${amount} bodů! 🎉`,
      body: reason,
      link: "/rewards",
    });

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

    await sendNotification({
      userId,
      type: "POINTS_DEDUCTED",
      title: `Odečteno ${amount} bodů`,
      body: reason,
      link: "/rewards",
    });

    revalidatePath("/rewards");
    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("deductPoints error:", err);
    return { error: "Nepodařilo se odečíst body" };
  }
}
