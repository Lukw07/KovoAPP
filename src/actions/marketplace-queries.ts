"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { MarketplaceCategory } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// GET ACTIVE LISTINGS
// ---------------------------------------------------------------------------

export async function getListings(category?: string) {
  const where: Record<string, unknown> = { isActive: true };
  if (
    category &&
    ["SELLING", "BUYING", "LOOKING_FOR", "OFFERING"].includes(category)
  ) {
    where.category = category as MarketplaceCategory;
  }

  return prisma.marketplaceListing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          department: { select: { name: true } },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// GET MY LISTINGS
// ---------------------------------------------------------------------------

export async function getMyListings() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.marketplaceListing.findMany({
    where: { authorId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });
}
