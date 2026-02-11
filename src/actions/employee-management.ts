"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendNotification } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { encrypt, decrypt } from "@/lib/security";

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
    totalHours: number;
    usedHours: number;
    remainingHours: number;
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
        select: { totalDays: true, usedDays: true, carriedOver: true, totalHours: true, usedHours: true, carriedOverHours: true },
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
            totalHours: vacation.totalHours + vacation.carriedOverHours,
            usedHours: vacation.usedHours,
            remainingHours:
              vacation.totalHours + vacation.carriedOverHours - vacation.usedHours,
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
      workFundType: true,
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
          totalHours: true,
          usedHours: true,
          carriedOverHours: true,
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
          totalHours: true,
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

  // Decrypt sensitive medical exam results
  const decryptedMedicalExams = user.medicalExams.map((exam) => ({
    ...exam,
    result: exam.result ? safeDecrypt(exam.result) : null,
  }));

  return {
    ...user,
    medicalExams: decryptedMedicalExams,
    stats: {
      sickDays,
      doctorDays,
      personalDays,
      homeOfficeDays,
    },
  };
}

/** Safely decrypt — returns original value if not encrypted (legacy data) */
function safeDecrypt(value: string): string {
  try {
    return decrypt(value);
  } catch {
    // Not encrypted (legacy data) — return as-is
    return value;
  }
}

// ── Update employee contact details (MANAGER/ADMIN) ────────────────────────

const updateContactSchema = z.object({
  userId: z.string().cuid(),
  name: z
    .string()
    .min(2, "Jméno musí mít alespoň 2 znaky")
    .max(100)
    .trim()
    .optional(),
  email: z
    .string()
    .email("Neplatný email")
    .transform((e) => e.toLowerCase().trim())
    .optional(),
  phone: z
    .string()
    .max(20, "Telefon je příliš dlouhý")
    .transform((v) => v?.trim() || null)
    .nullish(),
  position: z
    .string()
    .max(100)
    .transform((v) => v?.trim() || null)
    .nullish(),
  hireDate: z
    .string()
    .transform((v) => (v ? new Date(v) : undefined))
    .optional(),
});

export async function updateEmployeeContact(
  data: z.input<typeof updateContactSchema>,
) {
  const actor = await requireManagement();
  const parsed = updateContactSchema.parse(data);
  const { userId, ...fields } = parsed;

  // Remove undefined values
  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updateData[key] = value;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return { error: "Žádná data k aktualizaci" };
  }

  // Verify user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!targetUser) {
    return { error: "Uživatel nenalezen" };
  }

  // Check email uniqueness if changing
  if (updateData.email && updateData.email !== targetUser.email) {
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

  await logAudit({
    action: "USER_UPDATED",
    entityType: "User",
    entityId: userId,
    performedBy: actor.id!,
    details: { ...updateData, updatedBy: "management" },
  });

  return { success: true };
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

  // Send notification to the employee
  const examTypeLabels: Record<string, string> = {
    VSTUPNI: "Vstupní",
    PERIODICKY: "Periodická",
    MIMORADNA: "Mimořádná",
    VYSTUPNI: "Výstupní",
    NASLEDNA: "Následná",
  };
  const typeLabel = examTypeLabels[parsed.type] ?? parsed.type;
  const dateStr = new Date(parsed.scheduledAt).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const doctorInfo = parsed.doctorName ? ` u lékaře ${parsed.doctorName}` : "";

  try {
    await sendNotification({
      userId: parsed.userId,
      type: "MEDICAL_EXAM",
      title: "🩺 Naplánovaná prohlídka",
      body: `${typeLabel} prohlídka${doctorInfo} dne ${dateStr}.${parsed.note ? " Poznámka: " + parsed.note : ""}`,
      link: "/requests",
    });
  } catch (err) {
    console.error("[MEDICAL_EXAM] Failed to send notification:", err);
  }

  return { success: true, id: exam.id };
}

export async function completeMedicalExam(
  examId: string,
  result: string,
  nextDueAt?: string,
) {
  await requireManagement();

  // Encrypt sensitive medical result (GDPR Art. 9 — special category data)
  const encryptedResult = encrypt(result);

  await prisma.medicalExamination.update({
    where: { id: examId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      result: encryptedResult,
      nextDueAt: nextDueAt ? new Date(nextDueAt) : null,
    },
  });

  return { success: true };
}

const vacationEntitlementSchema = z.object({
  userId: z.string().cuid(),
  year: z.number().int().min(2020).max(2040),
  totalDays: z.number().min(0).max(60).default(20),
  totalHours: z.number().min(0).max(480).default(160),
  carriedOver: z.number().min(0).max(30).default(0),
  carriedOverHours: z.number().min(0).max(240).default(0),
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
      totalHours: parsed.totalHours,
      carriedOver: parsed.carriedOver,
      carriedOverHours: parsed.carriedOverHours,
    },
    update: {
      totalDays: parsed.totalDays,
      totalHours: parsed.totalHours,
      carriedOver: parsed.carriedOver,
      carriedOverHours: parsed.carriedOverHours,
    },
  });

  return { success: true };
}

// ── Document management ─────────────────────────────────────────────────────

const documentSchema = z.object({
  userId: z.string().cuid(),
  title: z.string().min(1, "Název je povinný").max(200),
  category: z.enum(["CONTRACT", "MEDICAL", "TRAINING", "CERTIFICATION", "ID_CARD", "OTHER"]),
  description: z.string().max(2000).optional(),
  fileUrl: z.string().min(1, "Soubor je povinný"),
  expiresAt: z.string().datetime().optional(),
});

export async function createDocument(data: z.infer<typeof documentSchema>) {
  await requireManagement();
  const parsed = documentSchema.parse(data);

  const doc = await prisma.employeeDocument.create({
    data: {
      userId: parsed.userId,
      title: parsed.title,
      category: parsed.category,
      description: parsed.description || null,
      fileUrl: parsed.fileUrl,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
    },
  });

  return { success: true, id: doc.id };
}

export async function deleteDocument(documentId: string) {
  await requireManagement();

  await prisma.employeeDocument.delete({
    where: { id: documentId },
  });

  return { success: true };
}

// ── Update employee work fund type ──────────────────────────────────────────

export async function updateWorkFundType(
  userId: string,
  workFundType: "FULL_8H" | "STANDARD_7_5H" | "PART_TIME_6H",
) {
  await requireManagement();

  await prisma.user.update({
    where: { id: userId },
    data: { workFundType },
  });

  return { success: true };
}
