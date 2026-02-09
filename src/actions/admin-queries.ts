"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Auth guard: ADMIN or MANAGER ────────────────────────────────────────────

async function requireManagement() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    throw new Error("Přístup odepřen");
  }
  return session;
}

// ─── Absence stats for current month ──────────────────────────────────────────

export async function getAbsenceStats() {
  await requireManagement();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const requests = await prisma.hrRequest.findMany({
    where: {
      status: "APPROVED",
      startDate: { lte: endOfMonth },
      endDate: { gte: startOfMonth },
    },
    select: {
      type: true,
      totalDays: true,
    },
  });

  const stats: Record<string, { count: number; days: number }> = {
    VACATION: { count: 0, days: 0 },
    SICK_DAY: { count: 0, days: 0 },
    DOCTOR: { count: 0, days: 0 },
    PERSONAL_DAY: { count: 0, days: 0 },
    HOME_OFFICE: { count: 0, days: 0 },
  };

  for (const req of requests) {
    const t = req.type as string;
    if (stats[t]) {
      stats[t].count += 1;
      stats[t].days += req.totalDays;
    }
  }

  return Object.entries(stats).map(([type, data]) => ({
    type,
    label: absenceLabel(type),
    count: data.count,
    days: data.days,
  }));
}

function absenceLabel(type: string): string {
  const map: Record<string, string> = {
    VACATION: "Dovolená",
    SICK_DAY: "Sick day",
    DOCTOR: "Lékař",
    PERSONAL_DAY: "Osobní volno",
    HOME_OFFICE: "Home office",
  };
  return map[type] ?? type;
}

// ─── Points distributed this month ───────────────────────────────────────────

export async function getPointsStats() {
  await requireManagement();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const transactions = await prisma.pointTransaction.findMany({
    where: {
      createdAt: { gte: startOfMonth, lte: endOfMonth },
      amount: { gt: 0 }, // only awards
    },
    select: {
      amount: true,
      category: true,
      createdAt: true,
    },
  });

  // By category
  const byCategory: Record<string, number> = {};
  let totalPoints = 0;

  for (const tx of transactions) {
    const cat = tx.category ?? "Ostatní";
    byCategory[cat] = (byCategory[cat] ?? 0) + tx.amount;
    totalPoints += tx.amount;
  }

  const categoryData = Object.entries(byCategory).map(([category, points]) => ({
    category: categoryLabel(category),
    points,
  }));

  // By day (for line chart)
  const byDay: Record<string, number> = {};
  for (const tx of transactions) {
    const day = tx.createdAt.toISOString().slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + tx.amount;
  }

  const dailyData = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, points]) => ({
      date: formatDateShort(date),
      points,
    }));

  return {
    totalPoints,
    totalTransactions: transactions.length,
    categoryData,
    dailyData,
  };
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    performance: "Výkon",
    teamwork: "Týmová práce",
    innovation: "Inovace",
    reward_claim: "Odměna",
    Ostatní: "Ostatní",
  };
  return map[cat] ?? cat;
}

function formatDateShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${parseInt(d)}.${parseInt(m)}.`;
}

// ─── All users for management table ──────────────────────────────────────────

export async function getAllUsers() {
  await requireManagement();
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      position: true,
      phone: true,
      isActive: true,
      hireDate: true,
      pointsBalance: true,
      department: {
        select: { name: true, code: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return users;
}

// ─── Departments list ─────────────────────────────────────────────────────────

export async function getDepartments() {
  await requireManagement();
  return prisma.department.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}

// ─── Vacation export data (for Helios CSV) ───────────────────────────────────

export async function getVacationExportData(year?: number, month?: number) {
  await requireManagement();
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth(); // 0-indexed

  const startOfMonth = new Date(y, m, 1);
  const endOfMonth = new Date(y, m + 1, 0, 23, 59, 59);

  const vacations = await prisma.hrRequest.findMany({
    where: {
      type: "VACATION",
      status: "APPROVED",
      startDate: { lte: endOfMonth },
      endDate: { gte: startOfMonth },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          department: { select: { name: true, code: true } },
        },
      },
    },
    orderBy: { startDate: "asc" },
  });

  return vacations.map((v) => ({
    jmeno: v.user.name,
    email: v.user.email,
    oddeleni: v.user.department?.name ?? "",
    kodOddeleni: v.user.department?.code ?? "",
    typ: "Dovolená",
    datumOd: v.startDate.toISOString().slice(0, 10),
    datumDo: v.endDate.toISOString().slice(0, 10),
    pulDenZacatek: v.isHalfDayStart ? "Ano" : "Ne",
    pulDenKonec: v.isHalfDayEnd ? "Ano" : "Ne",
    celkemDnu: v.totalDays,
  }));
}

// ─── Dashboard overview stats ─────────────────────────────────────────────────

export async function getDashboardOverview() {
  await requireManagement();
  const [totalUsers, activeUsers, pendingRequests, todayAbsent] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.hrRequest.count({ where: { status: "PENDING" } }),
      prisma.hrRequest.count({
        where: {
          status: "APPROVED",
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
          type: { not: "HOME_OFFICE" },
        },
      }),
    ]);

  return { totalUsers, activeUsers, pendingRequests, todayAbsent };
}
