"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import bcrypt from "bcrypt";
import { logAudit } from "@/lib/audit";
import { validatePasswordStrength } from "@/lib/security";

// Bcrypt work factor — 12 rounds for strong security
const BCRYPT_ROUNDS = 12;

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  email: z
    .string()
    .email("Neplatný email")
    .transform((e) => e.toLowerCase().trim()),
  name: z
    .string()
    .min(2, "Jméno musí mít alespoň 2 znaky")
    .max(100, "Jméno je příliš dlouhé")
    .trim(),
  password: z.string().min(8, "Heslo musí mít alespoň 8 znaků"),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]),
  position: z
    .string()
    .max(100, "Pozice je příliš dlouhá")
    .optional()
    .transform((v) => v?.trim() || undefined),
  phone: z
    .string()
    .max(20, "Telefon je příliš dlouhý")
    .optional()
    .transform((v) => v?.trim() || undefined),
  departmentId: z.string().optional(),
  hireDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
});

const updateUserSchema = z.object({
  userId: z.string().min(1),
  name: z
    .string()
    .min(2, "Jméno musí mít alespoň 2 znaky")
    .max(100, "Jméno je příliš dlouhé")
    .trim()
    .optional(),
  email: z
    .string()
    .email("Neplatný email")
    .transform((e) => e.toLowerCase().trim())
    .optional(),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).optional(),
  position: z
    .string()
    .max(100)
    .optional()
    .transform((v) => (v !== undefined ? v.trim() : undefined)),
  phone: z
    .string()
    .max(20)
    .nullable()
    .optional()
    .transform((v) => (v !== undefined ? (v?.trim() || null) : undefined)),
  departmentId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  hireDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
});

const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(8, "Heslo musí mít alespoň 8 znaků"),
});

// ─── Auth guard ──────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Přístup odepřen");
  }
  return session;
}

// ─── Create User ─────────────────────────────────────────────────────────────

export async function createUser(formData: FormData) {
  const session = await requireAdmin();

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    role: formData.get("role"),
    position: formData.get("position") || undefined,
    phone: formData.get("phone") || undefined,
    departmentId: formData.get("departmentId") || undefined,
    hireDate: formData.get("hireDate") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, name, password, role, position, phone, departmentId, hireDate } =
    parsed.data;

  // Validate password strength
  const strength = validatePasswordStrength(password);
  if (!strength.isStrong) {
    return { error: strength.errors[0] };
  }

  // Check duplicate email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Uživatel s tímto emailem již existuje" };
  }

  // Validate departmentId exists if provided
  if (departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) {
      return { error: "Vybrané oddělení neexistuje" };
    }
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const newUser = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role: role as "ADMIN" | "MANAGER" | "EMPLOYEE",
      position: position ?? null,
      phone: phone ?? null,
      departmentId: departmentId || null,
      hireDate: hireDate ?? new Date(),
    },
  });

  await logAudit({
    action: "USER_CREATED",
    entityType: "User",
    entityId: newUser.id,
    performedBy: session.user!.id!,
    details: { email, name, role, position, departmentId },
  });

  return { success: true, userName: newUser.name };
}

// ─── Update User ─────────────────────────────────────────────────────────────

export async function updateUser(formData: FormData) {
  const session = await requireAdmin();

  const parsed = updateUserSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name") || undefined,
    email: formData.get("email") || undefined,
    role: formData.get("role") || undefined,
    position: formData.get("position") !== null ? (formData.get("position") as string) : undefined,
    phone: formData.get("phone") !== null ? (formData.get("phone") as string) : undefined,
    departmentId:
      formData.get("departmentId") &&
      formData.get("departmentId") !== "" &&
      formData.get("departmentId") !== "null"
        ? formData.get("departmentId")
        : null,
    isActive:
      formData.get("isActive") === "true"
        ? true
        : formData.get("isActive") === "false"
          ? false
          : undefined,
    hireDate: formData.get("hireDate") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { userId, ...data } = parsed.data;

  // Verify target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });
  if (!targetUser) {
    return { error: "Uživatel nenalezen" };
  }

  // Prevent admin from demoting themselves
  if (userId === session.user!.id && data.role && data.role !== "ADMIN") {
    return { error: "Nemůžete změnit svou vlastní roli" };
  }

  // Prevent admin from deactivating themselves
  if (userId === session.user!.id && data.isActive === false) {
    return { error: "Nemůžete deaktivovat svůj vlastní účet" };
  }

  // If demoting/changing role of another admin, check admin count
  if (targetUser.role === "ADMIN" && data.role && data.role !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return { error: "Nelze odebrat roli poslednímu administrátorovi" };
    }
  }

  // Remove undefined values
  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      updateData[key] = value;
    }
  }

  // Check email uniqueness if changing
  if (updateData.email) {
    const existing = await prisma.user.findFirst({
      where: {
        email: updateData.email as string,
        id: { not: userId },
      },
    });
    if (existing) {
      return { error: "Tento email je již používán jiným uživatelem" };
    }
  }

  // Validate departmentId if changing
  if (updateData.departmentId && updateData.departmentId !== null) {
    const dept = await prisma.department.findUnique({
      where: { id: updateData.departmentId as string },
    });
    if (!dept) {
      return { error: "Vybrané oddělení neexistuje" };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  await logAudit({
    action: "USER_UPDATED",
    entityType: "User",
    entityId: userId,
    performedBy: session.user!.id!,
    details: updateData,
  });

  return { success: true };
}

// ─── Reset Password ─────────────────────────────────────────────────────────

export async function resetPassword(formData: FormData) {
  const session = await requireAdmin();

  const parsed = resetPasswordSchema.safeParse({
    userId: formData.get("userId"),
    newPassword: formData.get("newPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { userId, newPassword } = parsed.data;

  // Verify target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });
  if (!targetUser) {
    return { error: "Uživatel nenalezen" };
  }

  // Validate password strength
  const strength = validatePasswordStrength(newPassword);
  if (!strength.isStrong) {
    return { error: strength.errors[0] };
  }

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  await logAudit({
    action: "PASSWORD_RESET",
    entityType: "User",
    entityId: userId,
    performedBy: session.user!.id!,
    details: { targetUser: targetUser.name },
  });

  return { success: true };
}

// ─── Delete User ─────────────────────────────────────────────────────────────

const deleteUserSchema = z.object({
  userId: z.string().min(1),
  confirmEmail: z.string().email(),
});

export async function deleteUser(formData: FormData) {
  const session = await requireAdmin();

  const parsed = deleteUserSchema.safeParse({
    userId: formData.get("userId"),
    confirmEmail: formData.get("confirmEmail"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { userId, confirmEmail } = parsed.data;

  // Cannot delete yourself
  if (userId === session.user!.id) {
    return { error: "Nemůžete smazat svůj vlastní účet" };
  }

  // Verify user exists and email matches (safety check)
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!targetUser) {
    return { error: "Uživatel nenalezen" };
  }

  if (targetUser.email.toLowerCase() !== confirmEmail.toLowerCase()) {
    return { error: "Email neodpovídá – smazání zrušeno" };
  }

  // Cannot delete last admin
  if (targetUser.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return { error: "Nelze smazat posledního administrátora" };
    }
  }

  // Delete the user (cascade will handle related records)
  await prisma.user.delete({ where: { id: userId } });

  await logAudit({
    action: "USER_DELETED",
    entityType: "User",
    entityId: userId,
    performedBy: session.user!.id!,
    details: {
      deletedEmail: targetUser.email,
      deletedName: targetUser.name,
      deletedRole: targetUser.role,
    },
  });

  return { success: true, deletedName: targetUser.name };
}

// ─── Deactivate/Activate User ────────────────────────────────────────────────

export async function toggleUserActive(userId: string, isActive: boolean) {
  const session = await requireAdmin();

  if (userId === session.user!.id) {
    return { error: "Nemůžete deaktivovat svůj vlastní účet" };
  }

  // Verify user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!targetUser) {
    return { error: "Uživatel nenalezen" };
  }

  // Cannot deactivate the last admin
  if (!isActive && targetUser.role === "ADMIN") {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN", isActive: true },
    });
    if (adminCount <= 1) {
      return { error: "Nelze deaktivovat posledního aktivního administrátora" };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });

  await logAudit({
    action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    entityType: "User",
    entityId: userId,
    performedBy: session.user!.id!,
  });

  return { success: true };
}
