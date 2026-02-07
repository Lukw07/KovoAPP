"use server";

// ============================================================================
// HR Data-Fetching Queries (server-only)
// ============================================================================

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfDay, endOfDay } from "date-fns";

// ---------------------------------------------------------------------------
// Get current user's requests (paginated, newest first)
// ---------------------------------------------------------------------------

export async function getMyRequests(page = 1, pageSize = 20) {
  const session = await auth();
  if (!session?.user?.id) return { items: [], total: 0 };

  const where = { userId: session.user.id };

  const [items, total] = await Promise.all([
    prisma.hrRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        approver: { select: { name: true } },
      },
    }),
    prisma.hrRequest.count({ where }),
  ]);

  return { items, total };
}

// ---------------------------------------------------------------------------
// Get approved vacations for calendar view (current user, given year)
// ---------------------------------------------------------------------------

export async function getMyApprovedVacations(year: number) {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.hrRequest.findMany({
    where: {
      userId: session.user.id,
      status: "APPROVED",
      type: { in: ["VACATION", "PERSONAL_DAY", "HOME_OFFICE"] },
      startDate: { lte: new Date(`${year}-12-31T23:59:59`) },
      endDate: { gte: new Date(`${year}-01-01T00:00:00`) },
    },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      type: true,
      startDate: true,
      endDate: true,
      totalDays: true,
    },
  });
}

// ---------------------------------------------------------------------------
// "Who is absent today" — approved absence in user's department
// ---------------------------------------------------------------------------

export async function getAbsentToday() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // Find user's department
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { departmentId: true },
  });

  if (!user?.departmentId) return [];

  const absentRequests = await prisma.hrRequest.findMany({
    where: {
      status: "APPROVED",
      type: { in: ["VACATION", "SICK_DAY", "DOCTOR", "PERSONAL_DAY"] },
      startDate: { lte: todayEnd },
      endDate: { gte: todayStart },
      user: { departmentId: user.departmentId },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          position: true,
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  return absentRequests;
}

// ---------------------------------------------------------------------------
// Get pending requests for managers (their department)
// ---------------------------------------------------------------------------

export async function getPendingForManager() {
  const session = await auth();
  if (!session?.user?.id) return [];

  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return [];
  }

  // Admins see all pending, managers see their department's pending
  const departmentFilter =
    session.user.role === "ADMIN"
      ? {}
      : { user: { departmentId: session.user.departmentId } };

  return prisma.hrRequest.findMany({
    where: {
      status: "PENDING",
      ...departmentFilter,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          position: true,
          department: { select: { name: true, code: true, color: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}
