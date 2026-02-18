"use server";

// ============================================================================
// HR Server Actions — create / approve / reject requests
// ============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { emitRealtimeEvent } from "@/lib/socket-server";
import {
  differenceInBusinessDays,
  eachDayOfInterval,
  isWeekend,
} from "date-fns";
import type { WorkFundType } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const createRequestSchema = z
  .object({
    type: z.enum(["VACATION", "SICK_DAY", "DOCTOR", "PERSONAL_DAY", "HOME_OFFICE"]),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().max(1000).optional(),
    isHalfDayStart: z.boolean().default(false),
    isHalfDayEnd: z.boolean().default(false),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "Datum konce nemůže být před začátkem",
    path: ["endDate"],
  });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Hours per day for each work fund type */
const FUND_HOURS: Record<WorkFundType, number> = {
  FULL_8H: 8,
  STANDARD_7_5H: 7.5,
  PART_TIME_6H: 6,
};

const FUND_TYPE_LABELS: Record<WorkFundType, string> = {
  FULL_8H: "Plný úvazek (8h/den)",
  STANDARD_7_5H: "Standardní (7,5h/den)",
  PART_TIME_6H: "Zkrácený (6h/den)",
};

/** Count working days between two dates, optionally with half-days. */
function calcWorkingDays(
  start: Date,
  end: Date,
  halfStart: boolean,
  halfEnd: boolean,
): number {
  const days = eachDayOfInterval({ start, end }).filter(
    (d) => !isWeekend(d),
  ).length;

  let total = days;
  if (halfStart && days > 0) total -= 0.5;
  if (halfEnd && days > 0) total -= 0.5;
  return Math.max(total, 0.5);
}

/** Calculate working hours based on days and employee's work fund type. */
function calcWorkingHours(
  workingDays: number,
  fundType: WorkFundType,
): number {
  return workingDays * FUND_HOURS[fundType];
}

// Czech holidays are in @/lib/holidays.ts (shared with client components)

// ---------------------------------------------------------------------------
// createRequest
// ---------------------------------------------------------------------------

export type CreateRequestState = {
  error?: string;
  warning?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

function isMissingColumnError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2022"
  );
}

function isMissingSchemaObjectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2021"
  );
}

async function safeSendNotification(
  params: Parameters<typeof sendNotification>[0],
): Promise<void> {
  try {
    await sendNotification(params);
  } catch (error) {
    console.error("[HR] Notification side-effect failed:", error);
  }
}

export async function createRequest(
  _prev: CreateRequestState | undefined,
  formData: FormData,
): Promise<CreateRequestState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nejste přihlášen/a" };

  const parsed = createRequestSchema.safeParse({
    type: formData.get("type"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: formData.get("reason"),
    isHalfDayStart: formData.get("isHalfDayStart") === "true",
    isHalfDayEnd: formData.get("isHalfDayEnd") === "true",
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { type, startDate, endDate, reason, isHalfDayStart, isHalfDayEnd } =
    parsed.data;

  try {
    // ---------- Check for overlapping requests ----------
    const overlapping = await prisma.hrRequest.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    if (overlapping) {
      return {
        error:
          "V tomto období již máte existující žádost. Zkontrolujte prosím své žádosti.",
      };
    }

    // ---------- Fetch user's work fund type ----------
    let fundType: WorkFundType = "FULL_8H";
    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { workFundType: true },
      });
      fundType = currentUser?.workFundType ?? "FULL_8H";
    } catch (error) {
      if (!isMissingColumnError(error)) {
        throw error;
      }

      console.warn(
        "[HR] users.workFundType column missing (P2022) — using FULL_8H fallback",
      );
    }

    const totalDays = calcWorkingDays(
      startDate,
      endDate,
      isHalfDayStart,
      isHalfDayEnd,
    );
    const totalHours = calcWorkingHours(totalDays, fundType);

    // ── Check vacation balance (allow over-limit but warn) ──────────────
    let isOverLimit = false;
    let warningMessage: string | undefined;
    const deductibleTypes: string[] = ["VACATION", "PERSONAL_DAY"];
    if (deductibleTypes.includes(type)) {
      const requestYear = startDate.getFullYear();
      try {
        const entitlement = await prisma.vacationEntitlement.findUnique({
          where: { userId_year: { userId: session.user.id, year: requestYear } },
        });
        if (entitlement) {
          const remainingHours = entitlement.totalHours + entitlement.carriedOverHours - entitlement.usedHours;
          if (totalHours > remainingHours) {
            isOverLimit = true;
            warningMessage = `Pozor: Požadujete ${totalHours}h, ale zbývá pouze ${remainingHours}h. Žádost bude odeslána, ale bude označena jako přečerpání.`;
          }
        }
      } catch (error) {
        if (!isMissingColumnError(error)) {
          throw error;
        }

        console.warn(
          "[HR] vacation entitlement columns missing (P2022) — skipping over-limit calculation",
        );
      }
      // If no entitlement exists, allow the request (tracking not configured)
    }

    try {
      await prisma.hrRequest.create({
        data: {
          type,
          startDate,
          endDate,
          reason,
          isHalfDayStart,
          isHalfDayEnd,
          totalDays,
          totalHours,
          isOverLimit,
          userId: session.user.id,
        },
      });
    } catch (error) {
      if (!isMissingColumnError(error)) {
        throw error;
      }

      console.warn(
        "[HR] hr_requests newer columns missing (P2022) — creating request with legacy field set",
      );

      await prisma.hrRequest.create({
        data: {
          type,
          startDate,
          endDate,
          reason,
          userId: session.user.id,
        },
      });
    }

    // Notify department manager (if any)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { department: { include: { manager: true } } },
    });

    const typeLabels: Record<string, string> = {
      VACATION: "dovolenou",
      SICK_DAY: "sick day",
      DOCTOR: "návštěvu lékaře",
      PERSONAL_DAY: "osobní volno",
      HOME_OFFICE: "home office",
    };
    const notificationBody = `${user?.name ?? "Zaměstnanec"} žádá o ${typeLabels[type] ?? type} (${totalHours}h)`;
    const overLimitSuffix = isOverLimit ? " ⚠️ PŘEČERPÁNÍ DOVOLENÉ" : "";

    // Track who was already notified to avoid duplicates
    const notifiedIds = new Set<string>();

    if (user?.department?.manager) {
      await safeSendNotification({
        userId: user.department.manager.id,
        type: "HR_REQUEST_CREATED",
        title: "Nová žádost" + overLimitSuffix,
        body: notificationBody + (isOverLimit ? " — PŘEKROČEN LIMIT HODIN" : ""),
        link: "/requests",
      });
      notifiedIds.add(user.department.manager.id);

      // Realtime event for manager's dashboard
      emitRealtimeEvent("hr:request_update", user.department.manager.id, {
        action: "created",
        requesterName: user.name,
        type,
      }).catch(() => {});
    }

    // Also notify all admins (who haven't already been notified)
    let admins: { id: string }[] = [];
    try {
      admins = await prisma.user.findMany({
        where: {
          role: "ADMIN",
          isActive: true,
          id: { notIn: [session.user.id, ...Array.from(notifiedIds)] },
        },
        select: { id: true },
      });
    } catch (error) {
      if (!isMissingColumnError(error)) {
        throw error;
      }

      console.warn(
        "[HR] users.isActive column missing (P2022) — falling back to admin lookup without isActive filter",
      );

      admins = await prisma.user.findMany({
        where: {
          role: "ADMIN",
          id: { notIn: [session.user.id, ...Array.from(notifiedIds)] },
        },
        select: { id: true },
      });
    }
    for (const admin of admins) {
      await safeSendNotification({
        userId: admin.id,
        type: "HR_REQUEST_CREATED",
        title: "Nová žádost" + overLimitSuffix,
        body: notificationBody + (isOverLimit ? " — PŘEKROČEN LIMIT HODIN" : ""),
        link: "/requests",
      });

      emitRealtimeEvent("hr:request_update", admin.id, {
        action: "created",
        requesterName: user?.name,
        type,
      }).catch(() => {});
    }

    // Warn requester about over-limit
    if (isOverLimit) {
      await safeSendNotification({
        userId: session.user.id,
        type: "VACATION_REMINDER",
        title: "⚠️ Přečerpání dovolené",
        body: `Vaše žádost o ${typeLabels[type] ?? type} překračuje dostupný limit hodin. Žádost byla odeslána, ale vyžaduje zvláštní schválení.`,
        link: "/requests",
      });
    }

    revalidatePath("/requests");
    revalidatePath("/dashboard");
    return { success: true, warning: warningMessage };
  } catch (error) {
    if (isMissingSchemaObjectError(error)) {
      console.error("[HR] Missing table/column in DB schema:", error);
      return {
        error:
          "Databáze není po aktualizaci aplikace plně synchronizovaná. Kontaktujte správce.",
      };
    }

    console.error("[HR] createRequest failed:", error);
    return {
      error: "Nepodařilo se odeslat žádost. Zkuste to prosím znovu.",
    };
  }
}

// ---------------------------------------------------------------------------
// approveRequest
// ---------------------------------------------------------------------------

export async function approveRequest(
  requestId: string,
  note?: string,
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nejste přihlášen/a" };

  // Only MANAGER or ADMIN can approve
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return { error: "Nemáte oprávnění ke schvalování žádostí" };
  }

  const request = await prisma.hrRequest.findUnique({
    where: { id: requestId },
    include: { user: true },
  });
  if (!request) return { error: "Žádost nenalezena" };
  if (request.status !== "PENDING") {
    return { error: "Tato žádost již byla zpracována" };
  }

  await prisma.hrRequest.update({
    where: { id: requestId },
    data: {
      status: "APPROVED",
      approverId: session.user.id,
      note: note ?? null,
    },
  });

  // ── Deduct vacation hours if entitlement exists ─────────────────────
  // Only deduct for types that consume vacation/personal days
  const deductibleTypes: string[] = ["VACATION", "PERSONAL_DAY"];
  if (deductibleTypes.includes(request.type)) {
    const requestYear = request.startDate.getFullYear();
    const entitlement = await prisma.vacationEntitlement.findUnique({
      where: { userId_year: { userId: request.userId, year: requestYear } },
    });
    if (entitlement) {
      await prisma.vacationEntitlement.update({
        where: { id: entitlement.id },
        data: {
          usedDays: { increment: request.totalDays },
          usedHours: { increment: request.totalHours },
        },
      });
    }
    // If no entitlement is set for this user/year, skip deduction silently
  }

  await logAudit({
    action: "HR_REQUEST_APPROVED",
    entityType: "HrRequest",
    entityId: requestId,
    performedBy: session.user.id,
    details: { userId: request.userId, type: request.type, note },
  });

  // Notify the requester
  await sendNotification({
    userId: request.userId,
    type: "HR_REQUEST_APPROVED",
    title: "Žádost schválena ✅",
    body: `Vaše žádost o ${request.type.toLowerCase()} byla schválena.`,
    link: "/requests",
  });

  emitRealtimeEvent("hr:request_update", request.userId, {
    action: "approved",
    requestId,
  }).catch(() => {});
  emitRealtimeEvent("hr:request_update", session.user.id, {
    action: "approved",
    requestId,
  }).catch(() => {});

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  return { success: true };
}

// ---------------------------------------------------------------------------
// rejectRequest
// ---------------------------------------------------------------------------

export async function rejectRequest(
  requestId: string,
  note?: string,
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nejste přihlášen/a" };

  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return { error: "Nemáte oprávnění k zamítání žádostí" };
  }

  const request = await prisma.hrRequest.findUnique({
    where: { id: requestId },
    include: { user: true },
  });
  if (!request) return { error: "Žádost nenalezena" };
  if (request.status !== "PENDING") {
    return { error: "Tato žádost již byla zpracována" };
  }

  await prisma.hrRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      approverId: session.user.id,
      note: note ?? null,
    },
  });

  await logAudit({
    action: "HR_REQUEST_REJECTED",
    entityType: "HrRequest",
    entityId: requestId,
    performedBy: session.user.id,
    details: { userId: request.userId, type: request.type, note },
  });

  // Notify the requester
  await sendNotification({
    userId: request.userId,
    type: "HR_REQUEST_REJECTED",
    title: "Žádost zamítnuta ❌",
    body: `Vaše žádost o ${request.type.toLowerCase()} byla zamítnuta.${note ? ` Důvod: ${note}` : ""}`,
    link: "/requests",
  });

  emitRealtimeEvent("hr:request_update", request.userId, {
    action: "rejected",
    requestId,
  }).catch(() => {});
  emitRealtimeEvent("hr:request_update", session.user.id, {
    action: "rejected",
    requestId,
  }).catch(() => {});

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  return { success: true };
}

// ---------------------------------------------------------------------------
// cancelRequest (user can cancel their own PENDING request)
// ---------------------------------------------------------------------------

export async function cancelRequest(
  requestId: string,
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nejste přihlášen/a" };

  const request = await prisma.hrRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) return { error: "Žádost nenalezena" };
  if (request.userId !== session.user.id) {
    return { error: "Tuto žádost nemůžete zrušit" };
  }
  if (request.status !== "PENDING") {
    return { error: "Lze zrušit pouze nevyřízené žádosti" };
  }

  await prisma.hrRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
  });

  emitRealtimeEvent("hr:request_update", "all", {
    action: "cancelled",
    requestId,
  }).catch(() => {});

  revalidatePath("/requests");
  return { success: true };
}
