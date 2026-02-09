"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { checkRateLimitAsync, SENSITIVE_ACTION_LIMITER } from "@/lib/rate-limit";
import { validatePasswordStrength } from "@/lib/security";

// Bcrypt work factor
const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Password change validation schema
// ---------------------------------------------------------------------------
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Současné heslo je povinné"),
    newPassword: z
      .string()
      .min(8, "Nové heslo musí mít alespoň 8 znaků")
      .regex(/[A-Z]/, "Heslo musí obsahovat alespoň jedno velké písmeno")
      .regex(/[0-9]/, "Heslo musí obsahovat alespoň jednu číslici"),
    confirmPassword: z.string().min(1, "Potvrzení hesla je povinné"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Hesla se neshodují",
    path: ["confirmPassword"],
  });

// ---------------------------------------------------------------------------
// Change password action
// ---------------------------------------------------------------------------
export async function changePassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };

  // Rate limit password changes (Redis-backed for cross-instance)
  const rateCheck = await checkRateLimitAsync(SENSITIVE_ACTION_LIMITER, `pwd-${session.user.id}`);
  if (!rateCheck.allowed) {
    const minutes = Math.ceil(rateCheck.resetInMs / 60_000);
    return { error: `Příliš mnoho pokusů. Zkuste to za ${minutes} min.` };
  }

  const raw = {
    currentPassword: formData.get("currentPassword") as string,
    newPassword: formData.get("newPassword") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { error: firstError.message };
  }

  // Get user with password hash
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });

  if (!user) return { error: "Uživatel nenalezen" };

  // Verify current password
  const passwordMatch = await bcrypt.compare(
    parsed.data.currentPassword,
    user.password,
  );
  if (!passwordMatch) {
    logAudit({
      action: "PASSWORD_CHANGE_FAILED",
      entityType: "User",
      entityId: session.user.id,
      performedBy: session.user.id,
      details: { reason: "invalid_current_password" },
    });
    return { error: "Současné heslo není správné" };
  }

  // Validate new password strength
  const strength = validatePasswordStrength(parsed.data.newPassword);
  if (!strength.isStrong) {
    return { error: strength.errors[0] };
  }

  // Ensure new password is different from current
  const sameAsOld = await bcrypt.compare(parsed.data.newPassword, user.password);
  if (sameAsOld) {
    return { error: "Nové heslo se musí lišit od současného" };
  }

  // Hash new password and update
  const hashedPassword = await bcrypt.hash(parsed.data.newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashedPassword },
  });

  logAudit({
    action: "PASSWORD_CHANGED",
    entityType: "User",
    entityId: session.user.id,
    performedBy: session.user.id,
  });

  return { success: true };
}
