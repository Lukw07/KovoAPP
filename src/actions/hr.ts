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

// Czech holidays are in @/lib/holidays.ts (shared with client components)

// ---------------------------------------------------------------------------
// createRequest
// ---------------------------------------------------------------------------

export type CreateRequestState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

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

  const totalDays = calcWorkingDays(
    startDate,
    endDate,
    isHalfDayStart,
    isHalfDayEnd,
  );

  await prisma.hrRequest.create({
    data: {
      type,
      startDate,
      endDate,
      reason,
      isHalfDayStart,
      isHalfDayEnd,
      totalDays,
      userId: session.user.id,
    },
  });

  // Notify department manager (if any)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { department: { include: { manager: true } } },
  });
  if (user?.department?.manager) {
    const typeLabels: Record<string, string> = {
      VACATION: "dovolenou",
      SICK_DAY: "sick day",
      DOCTOR: "návštěvu lékaře",
      PERSONAL_DAY: "osobní volno",
      HOME_OFFICE: "home office",
    };
    await sendNotification({
      userId: user.department.manager.id,
      type: "HR_REQUEST_CREATED",
      title: "Nová žádost",
      body: `${user.name} žádá o ${typeLabels[type] ?? type}`,
      link: "/requests",
    });

    // Realtime event for manager's dashboard
    emitRealtimeEvent("hr:request_update", user.department.manager.id, {
      action: "created",
      requesterName: user.name,
      type,
    }).catch(() => {});
  }

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  return { success: true };
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

  revalidatePath("/requests");
  return { success: true };
}
