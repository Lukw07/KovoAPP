"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ============================================================================
// Employee Management Queries — for MANAGER / ADMIN roles
// ============================================================================

async function requireManagement() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    throw new Error("Forbidden");
  }
  return session.user;
}

// ── List all employees (with summary stats) ─────────────────────────────────

export interface EmployeeListItem {
  id: string;
  name: string;
  email: string;
  role: string;
  position: string | null;
  avatarUrl: string | null;
  phone: string | null;
  isActive: boolean;
  hireDate: Date;
  department: { name: string; code: string; color: string | null } | null;
  _count: {
    hrRequests: number;
    contracts: number;
    medicalExams: number;
  };
  currentContract: {
    type: string;
    endDate: Date | null;
    position: string;
  } | null;
  nextMedicalExam: {
    type: string;
    scheduledAt: Date;
    status: string;
  } | null;
  vacationBalance: {
    totalDays: number;
    usedDays: number;
    remaining: number;
  } | null;
  sickDaysThisYear: number;
}

export async function getEmployeeList(): Promise<EmployeeListItem[]> {
  await requireManagement();

  const currentYear = new Date().getFullYear();

  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      position: true,
      avatarUrl: true,
      phone: true,
      isActive: true,
      hireDate: true,
      department: {
        select: { name: true, code: true, color: true },
      },
      _count: {
        select: {
          hrRequests: true,
          contracts: true,
          medicalExams: true,
        },
      },
      contracts: {
        where: { status: "ACTIVE" },
        orderBy: { startDate: "desc" },
        take: 1,
        select: { type: true, endDate: true, position: true },
      },
      medicalExams: {
        where: { status: { in: ["SCHEDULED", "OVERDUE"] } },
        orderBy: { scheduledAt: "asc" },
        take: 1,
        select: { type: true, scheduledAt: true, status: true },
      },
      vacationEntitlements: {
        where: { year: currentYear },
        take: 1,
        select: { totalDays: true, usedDays: true, carriedOver: true },
      },
      hrRequests: {
        where: {
          type: "SICK_DAY",
          status: "APPROVED",
          startDate: {
            gte: new Date(`${currentYear}-01-01`),
          },
        },
        select: { totalDays: true },
      },
    },
  });

  return users.map((u) => {
    const vacation = u.vacationEntitlements[0];
    const sickDays = u.hrRequests
      .reduce((sum, r) => sum + r.totalDays, 0);

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      position: u.position,
      avatarUrl: u.avatarUrl,
      phone: u.phone,
      isActive: u.isActive,
      hireDate: u.hireDate,
      department: u.department,
      _count: u._count,
      currentContract: u.contracts[0] ?? null,
      nextMedicalExam: u.medicalExams[0] ?? null,
      vacationBalance: vacation
        ? {
            totalDays: vacation.totalDays + vacation.carriedOver,
            usedDays: vacation.usedDays,
            remaining:
              vacation.totalDays + vacation.carriedOver - vacation.usedDays,
          }
        : null,
      sickDaysThisYear: sickDays,
    };
  });
}

// ── Get single employee detail ──────────────────────────────────────────────

export async function getEmployeeDetail(userId: string) {
  await requireManagement();

  const currentYear = new Date().getFullYear();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      position: true,
      avatarUrl: true,
      phone: true,
      isActive: true,
      hireDate: true,
      pointsBalance: true,
      department: {
        select: { id: true, name: true, code: true, color: true },
      },
      contracts: {
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          type: true,
          status: true,
          startDate: true,
          endDate: true,
          position: true,
          hoursPerWeek: true,
          note: true,
          documentUrl: true,
        },
      },
      medicalExams: {
        orderBy: { scheduledAt: "desc" },
        select: {
          id: true,
          type: true,
          status: true,
          scheduledAt: true,
          completedAt: true,
          nextDueAt: true,
          result: true,
          doctorName: true,
          note: true,
          documentUrl: true,
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          category: true,
          description: true,
          fileUrl: true,
          expiresAt: true,
          createdAt: true,
        },
      },
      vacationEntitlements: {
        orderBy: { year: "desc" },
        take: 3,
        select: {
          id: true,
          year: true,
          totalDays: true,
          usedDays: true,
          carriedOver: true,
        },
      },
      hrRequests: {
        where: {
          startDate: { gte: new Date(`${currentYear}-01-01`) },
        },
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          type: true,
          status: true,
          startDate: true,
          endDate: true,
          totalDays: true,
          reason: true,
        },
      },
    },
  });

  if (!user) throw new Error("Not found");

  // Calculate sick days + personal days this year
  const sickDays = user.hrRequests
    .filter((r) => r.type === "SICK_DAY" && r.status === "APPROVED")
    .reduce((sum, r) => sum + r.totalDays, 0);
  const doctorDays = user.hrRequests
    .filter((r) => r.type === "DOCTOR" && r.status === "APPROVED")
    .reduce((sum, r) => sum + r.totalDays, 0);
  const personalDays = user.hrRequests
    .filter((r) => r.type === "PERSONAL_DAY" && r.status === "APPROVED")
    .reduce((sum, r) => sum + r.totalDays, 0);
  const homeOfficeDays = user.hrRequests
    .filter((r) => r.type === "HOME_OFFICE" && r.status === "APPROVED")
    .reduce((sum, r) => sum + r.totalDays, 0);

  return {
    ...user,
    stats: {
      sickDays,
      doctorDays,
      personalDays,
      homeOfficeDays,
    },
  };
}

// ── Mutations ───────────────────────────────────────────────────────────────

const contractSchema = z.object({
  userId: z.string().cuid(),
  type: z.enum(["HPP", "DPP", "DPC"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  position: z.string().min(1).max(200),
  hoursPerWeek: z.number().min(1).max(60).default(40),
  note: z.string().max(2000).optional(),
});

export async function createContract(data: z.infer<typeof contractSchema>) {
  const actor = await requireManagement();
  const parsed = contractSchema.parse(data);

  const contract = await prisma.employeeContract.create({
    data: {
      userId: parsed.userId,
      type: parsed.type,
      startDate: new Date(parsed.startDate),
      endDate: parsed.endDate ? new Date(parsed.endDate) : null,
      position: parsed.position,
      hoursPerWeek: parsed.hoursPerWeek,
      note: parsed.note,
    },
  });

  return { success: true, id: contract.id };
}

const medicalExamSchema = z.object({
  userId: z.string().cuid(),
  type: z.enum(["VSTUPNI", "PERIODICKY", "MIMORADNA", "VYSTUPNI", "NASLEDNA"]),
  scheduledAt: z.string().datetime(),
  doctorName: z.string().max(200).optional(),
  note: z.string().max(2000).optional(),
});

export async function createMedicalExam(
  data: z.infer<typeof medicalExamSchema>,
) {
  const actor = await requireManagement();
  const parsed = medicalExamSchema.parse(data);

  const exam = await prisma.medicalExamination.create({
    data: {
      userId: parsed.userId,
      type: parsed.type,
      scheduledAt: new Date(parsed.scheduledAt),
      doctorName: parsed.doctorName,
      note: parsed.note,
    },
  });

  return { success: true, id: exam.id };
}

export async function completeMedicalExam(
  examId: string,
  result: string,
  nextDueAt?: string,
) {
  await requireManagement();

  await prisma.medicalExamination.update({
    where: { id: examId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      result,
      nextDueAt: nextDueAt ? new Date(nextDueAt) : null,
    },
  });

  return { success: true };
}

const vacationEntitlementSchema = z.object({
  userId: z.string().cuid(),
  year: z.number().int().min(2020).max(2040),
  totalDays: z.number().min(0).max(60).default(20),
  carriedOver: z.number().min(0).max(30).default(0),
});

export async function upsertVacationEntitlement(
  data: z.infer<typeof vacationEntitlementSchema>,
) {
  await requireManagement();
  const parsed = vacationEntitlementSchema.parse(data);

  await prisma.vacationEntitlement.upsert({
    where: {
      userId_year: {
        userId: parsed.userId,
        year: parsed.year,
      },
    },
    create: {
      userId: parsed.userId,
      year: parsed.year,
      totalDays: parsed.totalDays,
      carriedOver: parsed.carriedOver,
    },
    update: {
      totalDays: parsed.totalDays,
      carriedOver: parsed.carriedOver,
    },
  });

  return { success: true };
}
