"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { MarketplaceCategory } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// GET ACTIVE LISTINGS (with search, sorting, images)
// ---------------------------------------------------------------------------

interface ListingsOptions {
  category?: string;
  search?: string;
  sortBy?: "newest" | "oldest" | "price_asc" | "price_desc";
  page?: number;
  perPage?: number;
}

export async function getListings(options: ListingsOptions = {}) {
  const {
    category,
    search,
    sortBy = "newest",
    page = 1,
    perPage = 20,
  } = options;

  const where: Prisma.MarketplaceListingWhereInput = { isActive: true };

  // Category filter
  if (
    category &&
    ["SELLING", "BUYING", "LOOKING_FOR", "OFFERING"].includes(category)
  ) {
    where.category = category as MarketplaceCategory;
  }

  // Search (title + description)
  if (search && search.trim().length > 0) {
    const term = search.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
    ];
  }

  // Sort
  let orderBy: Prisma.MarketplaceListingOrderByWithRelationInput;
  switch (sortBy) {
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
    case "price_asc":
      orderBy = { price: { sort: "asc", nulls: "last" } };
      break;
    case "price_desc":
      orderBy = { price: { sort: "desc", nulls: "last" } };
      break;
    default:
      orderBy = { createdAt: "desc" };
  }

  const [listings, total] = await Promise.all([
    prisma.marketplaceListing.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            department: { select: { name: true } },
          },
        },
        images: {
          orderBy: { order: "asc" },
          select: { id: true, url: true, thumbUrl: true, order: true },
        },
      },
    }),
    prisma.marketplaceListing.count({ where }),
  ]);

  return {
    listings,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
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
      images: {
        orderBy: { order: "asc" },
        select: { id: true, url: true, thumbUrl: true, order: true },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// GET SINGLE LISTING (detail)
// ---------------------------------------------------------------------------

export async function getListingById(id: string) {
  return prisma.marketplaceListing.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          department: { select: { name: true } },
        },
      },
      images: {
        orderBy: { order: "asc" },
        select: { id: true, url: true, thumbUrl: true, order: true },
      },
    },
  });
}
