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

  // Create reservation (pending approval by manager/admin)
  const reservation = await prisma.reservation.create({
    data: {
      resourceId,
      startTime,
      endTime,
      purpose,
      status: "PENDING",
      userId: session.user.id,
    },
  });

  // Notification to the user
  await sendNotification({
    userId: session.user.id,
    type: "RESERVATION_CONFIRMED",
    title: "Rezervace odeslána ⏳",
    body: `Vaše rezervace ${resource.name} čeká na schválení.`,
    link: "/reservations",
  });

  // Notify all managers and admins about pending reservation
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });
  const managers = await prisma.user.findMany({
    where: {
      role: { in: ["MANAGER", "ADMIN"] },
      isActive: true,
      id: { not: session.user.id },
    },
    select: { id: true },
  });
  for (const mgr of managers) {
    await sendNotification({
      userId: mgr.id,
      type: "RESERVATION_CONFIRMED",
      title: "Nová rezervace ke schválení",
      body: `${currentUser?.name ?? "Uživatel"} žádá o rezervaci: ${resource.name}`,
      link: "/reservations",
    });
  }

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

  emitRealtimeEvent("reservation:update", "all", {
    action: "cancelled",
    resourceName: reservation.resource.name,
  }).catch(() => {});

  revalidatePath("/reservations");
  revalidatePath("/dashboard");
  return { success: true };
}

// ---------------------------------------------------------------------------
// approveReservation — manager/admin approves a pending reservation
// ---------------------------------------------------------------------------

export async function approveReservation(
  reservationId: string,
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nejste přihlášen/a" };

  // Only managers and admins can approve
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!currentUser || !["MANAGER", "ADMIN"].includes(currentUser.role)) {
    return { error: "Nemáte oprávnění schvalovat rezervace" };
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { resource: { select: { name: true } } },
  });

  if (!reservation) return { error: "Rezervace nenalezena" };
  if (reservation.status !== "PENDING") {
    return { error: "Tuto rezervaci nelze schválit" };
  }

  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: "CONFIRMED" },
  });

  // Notify the user who requested the reservation
  await sendNotification({
    userId: reservation.userId,
    type: "RESERVATION_CONFIRMED",
    title: "Rezervace schválena ✅",
    body: `Vaše rezervace ${reservation.resource.name} byla schválena.`,
    link: "/reservations",
  });

  emitRealtimeEvent("reservation:update", "all", {
    action: "approved",
    resourceName: reservation.resource.name,
  }).catch(() => {});

  revalidatePath("/reservations");
  revalidatePath("/dashboard");
  return { success: true };
}

// ---------------------------------------------------------------------------
// rejectReservation — manager/admin rejects a pending reservation
// ---------------------------------------------------------------------------

export async function rejectReservation(
  reservationId: string,
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nejste přihlášen/a" };

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!currentUser || !["MANAGER", "ADMIN"].includes(currentUser.role)) {
    return { error: "Nemáte oprávnění zamítat rezervace" };
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { resource: { select: { name: true } } },
  });

  if (!reservation) return { error: "Rezervace nenalezena" };
  if (reservation.status !== "PENDING") {
    return { error: "Tuto rezervaci nelze zamítnout" };
  }

  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: "CANCELLED" },
  });

  // Notify the user who requested the reservation
  await sendNotification({
    userId: reservation.userId,
    type: "RESERVATION_CANCELLED",
    title: "Rezervace zamítnuta ❌",
    body: `Vaše rezervace ${reservation.resource.name} byla zamítnuta.`,
    link: "/reservations",
  });

  emitRealtimeEvent("reservation:update", "all", {
    action: "rejected",
    resourceName: reservation.resource.name,
  }).catch(() => {});

  revalidatePath("/reservations");
  revalidatePath("/dashboard");
  return { success: true };
}
