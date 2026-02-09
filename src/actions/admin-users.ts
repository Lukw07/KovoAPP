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
  email: z.string().email("Neplatný email"),
  name: z.string().min(2, "Jméno musí mít alespoň 2 znaky"),
  password: z.string().min(8, "Heslo musí mít alespoň 8 znaků"),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]),
  position: z.string().optional(),
  departmentId: z.string().optional(),
});

const updateUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2, "Jméno musí mít alespoň 2 znaky").optional(),
  email: z.string().email("Neplatný email").optional(),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).optional(),
  position: z.string().optional(),
  departmentId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
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
  await requireAdmin();

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    role: formData.get("role"),
    position: formData.get("position") || undefined,
    departmentId: formData.get("departmentId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, name, password, role, position, departmentId } = parsed.data;

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

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const newUser = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role: role as "ADMIN" | "MANAGER" | "EMPLOYEE",
      position,
      departmentId: departmentId || null,
    },
  });

  const session = await auth();
  await logAudit({
    action: "USER_CREATED",
    entityType: "User",
    entityId: newUser.id,
    performedBy: session!.user!.id!,
    details: { email, name, role },
  });

  return { success: true };
}

// ─── Update User ─────────────────────────────────────────────────────────────

export async function updateUser(formData: FormData) {
  await requireAdmin();

  const parsed = updateUserSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name") || undefined,
    email: formData.get("email") || undefined,
    role: formData.get("role") || undefined,
    position: formData.get("position") || undefined,
    departmentId: formData.get("departmentId"),
    isActive: formData.get("isActive") === "true"
      ? true
      : formData.get("isActive") === "false"
        ? false
        : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { userId, ...data } = parsed.data;

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

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  const session = await auth();
  await logAudit({
    action: "USER_UPDATED",
    entityType: "User",
    entityId: userId,
    performedBy: session!.user!.id!,
    details: updateData,
  });

  return { success: true };
}

// ─── Reset Password ─────────────────────────────────────────────────────────

export async function resetPassword(formData: FormData) {
  await requireAdmin();

  const parsed = resetPasswordSchema.safeParse({
    userId: formData.get("userId"),
    newPassword: formData.get("newPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { userId, newPassword } = parsed.data;

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

  const session = await auth();
  await logAudit({
    action: "PASSWORD_RESET",
    entityType: "User",
    entityId: userId,
    performedBy: session!.user!.id!,
  });

  return { success: true };
}
