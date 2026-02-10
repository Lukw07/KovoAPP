"use server";

// ============================================================================
// Reservation Server Actions — book / cancel resources
// ============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";
import { emitRealtimeEvent } from "@/lib/socket-server";

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const bookResourceSchema = z
  .object({
    resourceId: z.string().min(1, "Vyberte zdroj"),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    purpose: z.string().max(500).optional(),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: "Konec musí být po začátku",
    path: ["endTime"],
  });

// ---------------------------------------------------------------------------
// bookResource — with conflict detection
// ---------------------------------------------------------------------------

export type BookResourceState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

export async function bookResource(
  _prev: BookResourceState | undefined,
  formData: FormData,
): Promise<BookResourceState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nejste přihlášen/a" };

  const parsed = bookResourceSchema.safeParse({
    resourceId: formData.get("resourceId"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    purpose: formData.get("purpose"),
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const { resourceId, startTime, endTime, purpose } = parsed.data;

  // Verify resource exists and is available
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
  });
  if (!resource) return { error: "Zdroj nenalezen" };
  if (!resource.isAvailable) {
    return { error: "Tento zdroj momentálně není k dispozici" };
  }

  // -------- Conflict detection --------
  // A conflict exists when an existing reservation overlaps the requested slot:
  //   existing.startTime < requested.endTime AND existing.endTime > requested.startTime
  const conflict = await prisma.reservation.findFirst({
    where: {
      resourceId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    include: {
      user: { select: { name: true } },
    },
  });

  if (conflict) {
    const fmt = (d: Date) =>
      d.toLocaleString("cs-CZ", {
        day: "numeric",
        month: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    return {
      error: `Časový konflikt! ${resource.name} je v období ${fmt(conflict.startTime)} – ${fmt(conflict.endTime)} rezervován/a uživatelem ${conflict.user.name}.`,
    };
  }

  // Create reservation (auto-confirmed for now)
  await prisma.reservation.create({
    data: {
      resourceId,
      startTime,
      endTime,
      purpose,
      status: "CONFIRMED",
      userId: session.user.id,
    },
  });

  // Notification to the user
  await sendNotification({
    userId: session.user.id,
    type: "RESERVATION_CONFIRMED",
    title: "Rezervace potvrzena ✅",
    body: `${resource.name} je rezervován/a pro vás.`,
    link: "/reservations",
  });

  // Realtime event so other users see calendar updates
  emitRealtimeEvent("reservation:update", "all", {
    action: "created",
    resourceName: resource.name,
  }).catch(() => {});

  revalidatePath("/reservations");
  revalidatePath("/dashboard");
  return { success: true };
}

// ---------------------------------------------------------------------------
// cancelReservation — user cancels their own booking
// ---------------------------------------------------------------------------

export async function cancelReservation(
  reservationId: string,
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nejste přihlášen/a" };

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { resource: { select: { name: true } } },
  });

  if (!reservation) return { error: "Rezervace nenalezena" };
  if (reservation.userId !== session.user.id) {
    return { error: "Nemůžete zrušit cizí rezervaci" };
  }
  if (reservation.status === "CANCELLED") {
    return { error: "Rezervace je již zrušena" };
  }
  if (reservation.status === "COMPLETED") {
    return { error: "Dokončenou rezervaci nelze zrušit" };
  }

  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: "CANCELLED" },
  });

  await sendNotification({
    userId: session.user.id,
    type: "RESERVATION_CANCELLED",
    title: "Rezervace zrušena",
    body: `Rezervace ${reservation.resource.name} byla zrušena.`,
    link: "/reservations",
  });

  revalidatePath("/reservations");
  revalidatePath("/dashboard");
  return { success: true };
}
