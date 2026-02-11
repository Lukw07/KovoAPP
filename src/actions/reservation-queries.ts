"use server";

// ============================================================================
// Reservation Data-Fetching Queries (server-only)
// ============================================================================

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfDay, endOfDay, addDays } from "date-fns";
import type { ResourceType } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Get all resources, optionally filtered by type
// ---------------------------------------------------------------------------

export async function getResources(type?: ResourceType) {
  return prisma.resource.findMany({
    where: {
      isAvailable: true,
      ...(type ? { type } : {}),
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

// ---------------------------------------------------------------------------
// Get reservations for a specific resource on a date range (for timeline)
// ---------------------------------------------------------------------------

export async function getResourceReservations(
  resourceId: string,
  date: Date,
  days = 2,
) {
  const start = startOfDay(date);
  const end = endOfDay(addDays(date, days - 1));

  return prisma.reservation.findMany({
    where: {
      resourceId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startTime: { lt: end },
      endTime: { gt: start },
    },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { startTime: "asc" },
  });
}

// ---------------------------------------------------------------------------
// Get current user's reservations (upcoming + recent)
// ---------------------------------------------------------------------------

export async function getMyReservations() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.reservation.findMany({
    where: { userId: session.user.id },
    include: {
      resource: {
        select: { id: true, name: true, type: true, location: true },
      },
    },
    orderBy: { startTime: "desc" },
    take: 30,
  });
}

// ---------------------------------------------------------------------------
// Get all pending reservations (for manager/admin approval)
// ---------------------------------------------------------------------------

export async function getPendingReservations() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!user || !["MANAGER", "ADMIN"].includes(user.role)) return [];

  return prisma.reservation.findMany({
    where: { status: "PENDING" },
    include: {
      resource: {
        select: { id: true, name: true, type: true, location: true },
      },
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { startTime: "asc" },
  });
}
