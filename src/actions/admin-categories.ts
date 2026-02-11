"use server";

// ============================================================================
// Admin Category Management — CRUD for HR Request & Resource categories
// ============================================================================

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN") {
    throw new Error("Forbidden — only admins");
  }
  return session.user;
}

// ---------------------------------------------------------------------------
// HR Request Categories
// ---------------------------------------------------------------------------

const hrCategorySchema = z.object({
  name: z.string().min(1, "Název je povinný").max(100).trim(),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Neplatná barva")
    .optional(),
  icon: z.string().max(10).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export async function getHrRequestCategories() {
  return prisma.hrRequestCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getAllHrRequestCategories() {
  await requireAdmin();
  return prisma.hrRequestCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createHrRequestCategory(
  data: z.infer<typeof hrCategorySchema>,
) {
  await requireAdmin();
  const parsed = hrCategorySchema.parse(data);

  await prisma.hrRequestCategory.create({
    data: {
      name: parsed.name,
      description: parsed.description || null,
      color: parsed.color || null,
      icon: parsed.icon || null,
      sortOrder: parsed.sortOrder,
    },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function updateHrRequestCategory(
  id: string,
  data: z.infer<typeof hrCategorySchema>,
) {
  await requireAdmin();
  const parsed = hrCategorySchema.parse(data);

  await prisma.hrRequestCategory.update({
    where: { id },
    data: {
      name: parsed.name,
      description: parsed.description || null,
      color: parsed.color || null,
      icon: parsed.icon || null,
      sortOrder: parsed.sortOrder,
    },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function toggleHrRequestCategory(id: string, isActive: boolean) {
  await requireAdmin();

  await prisma.hrRequestCategory.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function deleteHrRequestCategory(id: string) {
  await requireAdmin();

  await prisma.hrRequestCategory.delete({
    where: { id },
  });

  revalidatePath("/admin");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Resource Categories
// ---------------------------------------------------------------------------

const resourceCategorySchema = z.object({
  name: z.string().min(1, "Název je povinný").max(100).trim(),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Neplatná barva")
    .optional(),
  icon: z.string().max(10).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export async function getResourceCategories() {
  return prisma.resourceCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getAllResourceCategories() {
  await requireAdmin();
  return prisma.resourceCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createResourceCategory(
  data: z.infer<typeof resourceCategorySchema>,
) {
  await requireAdmin();
  const parsed = resourceCategorySchema.parse(data);

  await prisma.resourceCategory.create({
    data: {
      name: parsed.name,
      description: parsed.description || null,
      color: parsed.color || null,
      icon: parsed.icon || null,
      sortOrder: parsed.sortOrder,
    },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function updateResourceCategory(
  id: string,
  data: z.infer<typeof resourceCategorySchema>,
) {
  await requireAdmin();
  const parsed = resourceCategorySchema.parse(data);

  await prisma.resourceCategory.update({
    where: { id },
    data: {
      name: parsed.name,
      description: parsed.description || null,
      color: parsed.color || null,
      icon: parsed.icon || null,
      sortOrder: parsed.sortOrder,
    },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function toggleResourceCategory(id: string, isActive: boolean) {
  await requireAdmin();

  await prisma.resourceCategory.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function deleteResourceCategory(id: string) {
  await requireAdmin();

  await prisma.resourceCategory.delete({
    where: { id },
  });

  revalidatePath("/admin");
  return { success: true };
}
