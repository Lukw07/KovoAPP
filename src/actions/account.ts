"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { z } from "zod";

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
  if (!passwordMatch) return { error: "Současné heslo není správné" };

  // Hash new password and update
  const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashedPassword },
  });

  return { success: true };
}
