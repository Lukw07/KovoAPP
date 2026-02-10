"use server";

// ============================================================================
// Admin Resource CRUD — create / update / delete resources
// ============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ResourceType } from "@/generated/prisma/enums";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Nemáte oprávnění");
  }
  return session;
}

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const resourceSchema = z.object({
  name: z.string().min(1, "Název je povinný").max(100),
  type: z.enum(["CAR", "ROOM", "TOOL", "PARKING_SPOT"]),
  description: z.string().max(500).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  isAvailable: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// getAllResources — for admin list (includes unavailable)
// ---------------------------------------------------------------------------

export async function getAllResources() {
  await requireAdmin();

  return prisma.resource.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { reservations: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// createResource
// ---------------------------------------------------------------------------

export type ResourceActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

export async function createResource(
  _prev: ResourceActionState | undefined,
  formData: FormData,
): Promise<ResourceActionState> {
  await requireAdmin();

  const parsed = resourceSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    description: formData.get("description") || null,
    location: formData.get("location") || null,
    imageUrl: formData.get("imageUrl") || null,
    isAvailable: formData.get("isAvailable") !== "false",
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, type, description, location, imageUrl, isAvailable } = parsed.data;

  await prisma.resource.create({
    data: {
      name,
      type: type as ResourceType,
      description,
      location,
      imageUrl: imageUrl || null,
      isAvailable,
    },
  });

  revalidatePath("/reservations");
  revalidatePath("/admin");
  return { success: true };
}

// ---------------------------------------------------------------------------
// updateResource
// ---------------------------------------------------------------------------

export async function updateResource(
  resourceId: string,
  _prev: ResourceActionState | undefined,
  formData: FormData,
): Promise<ResourceActionState> {
  await requireAdmin();

  const existing = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!existing) return { error: "Zdroj nenalezen" };

  const parsed = resourceSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    description: formData.get("description") || null,
    location: formData.get("location") || null,
    imageUrl: formData.get("imageUrl") || null,
    isAvailable: formData.get("isAvailable") !== "false",
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, type, description, location, imageUrl, isAvailable } = parsed.data;

  await prisma.resource.update({
    where: { id: resourceId },
    data: {
      name,
      type: type as ResourceType,
      description,
      location,
      imageUrl: imageUrl || null,
      isAvailable,
    },
  });

  revalidatePath("/reservations");
  revalidatePath("/admin");
  return { success: true };
}

// ---------------------------------------------------------------------------
// toggleResourceAvailability — quick toggle
// ---------------------------------------------------------------------------

export async function toggleResourceAvailability(
  resourceId: string,
): Promise<{ error?: string; success?: boolean }> {
  await requireAdmin();

  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) return { error: "Zdroj nenalezen" };

  await prisma.resource.update({
    where: { id: resourceId },
    data: { isAvailable: !resource.isAvailable },
  });

  revalidatePath("/reservations");
  revalidatePath("/admin");
  return { success: true };
}

// ---------------------------------------------------------------------------
// deleteResource — only if no active reservations
// ---------------------------------------------------------------------------

export async function deleteResource(
  resourceId: string,
): Promise<{ error?: string; success?: boolean }> {
  await requireAdmin();

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: {
      _count: {
        select: {
          reservations: {
            where: { status: { in: ["PENDING", "CONFIRMED"] } },
          },
        },
      },
    },
  });

  if (!resource) return { error: "Zdroj nenalezen" };

  if (resource._count.reservations > 0) {
    return {
      error: `Zdroj má ${resource._count.reservations} aktivních rezervací. Nejprve je zrušte.`,
    };
  }

  await prisma.resource.delete({ where: { id: resourceId } });

  revalidatePath("/reservations");
  revalidatePath("/admin");
  return { success: true };
}
