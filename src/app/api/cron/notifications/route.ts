import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToAll, sendPushToUser } from "@/lib/notifications";

/**
 * Scheduled notifications cron endpoint.
 * Call this periodically (e.g. every 15 minutes) via:
 *   - External cron service (cron-job.org, Vercel cron, GitHub Actions)
 *   - Docker cron container
 *   - curl http://localhost:3000/api/cron/notifications?key=YOUR_SECRET
 *
 * Tasks:
 *   1. Mark expired reservations + notify owners
 *   2. Remind users whose vacation ends tomorrow
 *   3. Auto-close expired polls + notify all
 */
export async function GET(request: NextRequest) {
  // API key guard — fail-closed (rejects if CRON_SECRET is not set)
  const key = request.nextUrl.searchParams.get("key") ?? request.headers.get("authorization")?.replace("Bearer ", "");
  const expectedKey = process.env.CRON_SECRET;
  if (!expectedKey || key !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    expiredReservations: 0,
    vacationReminders: 0,
    closedPolls: 0,
  };

  // ── 1. Expired reservations ────────────────────────────────────────────
  try {
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        status: "CONFIRMED",
        endTime: { lt: new Date() },
      },
      include: {
        resource: { select: { name: true } },
      },
    });

    if (expiredReservations.length > 0) {
      // Batch update all expired reservations at once
      await prisma.reservation.updateMany({
        where: {
          id: { in: expiredReservations.map((r) => r.id) },
        },
        data: { status: "COMPLETED" },
      });

      // Batch create all notifications
      await prisma.notification.createMany({
        data: expiredReservations.map((res) => ({
          userId: res.userId,
          type: "RESERVATION_EXPIRED" as const,
          title: "Rezervace dokončena",
          body: `Vaše rezervace ${res.resource.name} skončila.`,
          link: "/reservations",
        })),
      });

      // Send push notifications (non-blocking, individual per user)
      await Promise.allSettled(
        expiredReservations.map((res) =>
          sendPushToUser(res.userId, "Rezervace dokončena", `Vaše rezervace ${res.resource.name} skončila.`, "/reservations"),
        ),
      );

      results.expiredReservations = expiredReservations.length;
    }
  } catch (err) {
    console.error("[CRON] Expired reservations error:", err);
  }

  // ── 2. Vacation ending tomorrow — remind users ─────────────────────────
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfTomorrow = new Date(tomorrow);
    startOfTomorrow.setHours(0, 0, 0, 0);
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    // Find approved HR requests (VACATION) that end tomorrow
    const vacationsEndingTomorrow = await prisma.hrRequest.findMany({
      where: {
        status: "APPROVED",
        type: "VACATION",
        endDate: {
          gte: startOfTomorrow,
          lte: endOfTomorrow,
        },
      },
      select: {
        userId: true,
        user: { select: { name: true } },
        endDate: true,
      },
    });

    // Avoid sending duplicate reminders — batch check instead of per-user
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get users already notified today
    const alreadyNotified = await prisma.notification.findMany({
      where: {
        type: "VACATION_REMINDER",
        createdAt: { gte: today },
        userId: { in: vacationsEndingTomorrow.map((v) => v.userId) },
      },
      select: { userId: true },
    });
    const notifiedSet = new Set(alreadyNotified.map((n) => n.userId));

    // Filter to only unnotified users
    const toNotify = vacationsEndingTomorrow.filter(
      (vac) => !notifiedSet.has(vac.userId),
    );

    if (toNotify.length > 0) {
      // Batch create notifications
      await prisma.notification.createMany({
        data: toNotify.map((vac) => ({
          userId: vac.userId,
          type: "VACATION_REMINDER" as const,
          title: "Konec dovolené zítra 🏖️",
          body: "Vaše dovolená končí zítra. Nezapomeňte se připravit na návrat!",
          link: "/requests",
        })),
      });

      // Send push (non-blocking)
      await Promise.allSettled(
        toNotify.map((vac) =>
          sendPushToUser(
            vac.userId,
            "Konec dovolené zítra 🏖️",
            "Vaše dovolená končí zítra. Nezapomeňte se připravit na návrat!",
            "/requests",
          ),
        ),
      );

      results.vacationReminders = toNotify.length;
    }
  } catch (err) {
    console.error("[CRON] Vacation reminders error:", err);
  }

  // ── 3. Auto-close expired polls ────────────────────────────────────────
  try {
    const expiredPolls = await prisma.poll.findMany({
      where: {
        isActive: true,
        activeUntil: {
          lt: new Date(),
          not: null,
        },
      },
      select: { id: true, question: true },
    });

    if (expiredPolls.length > 0) {
      // Batch update all polls at once
      await prisma.poll.updateMany({
        where: {
          id: { in: expiredPolls.map((p) => p.id) },
        },
        data: { isActive: false },
      });

      // Send a single broadcast for poll closures
      const pollNames = expiredPolls.map((p) => `„${p.question}"`).join(", ");
      await sendPushToAll(
        "📊 Ankety ukončeny",
        `${expiredPolls.length === 1 ? "Anketa" : "Ankety"} ${pollNames} ${expiredPolls.length === 1 ? "skončila" : "skončily"}. Výsledky jsou k dispozici.`,
        "/polls",
      );

      results.closedPolls = expiredPolls.length;
    }
  } catch (err) {
    console.error("[CRON] Expired polls error:", err);
  }

  console.log("[CRON] Notifications completed:", results);

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    ...results,
  });
}
