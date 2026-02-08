import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotification, sendPushToAll } from "@/lib/notifications";

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
  // Simple API key guard — prevents public abuse
  const key = request.nextUrl.searchParams.get("key");
  const expectedKey = process.env.CRON_SECRET;
  if (expectedKey && key !== expectedKey) {
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

    for (const res of expiredReservations) {
      await prisma.reservation.update({
        where: { id: res.id },
        data: { status: "COMPLETED" },
      });

      await sendNotification({
        userId: res.userId,
        type: "RESERVATION_EXPIRED",
        title: "Rezervace dokončena",
        body: `Vaše rezervace ${res.resource.name} skončila.`,
        link: "/reservations",
      });

      results.expiredReservations++;
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

    // Avoid sending duplicate reminders — check if already notified today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const vac of vacationsEndingTomorrow) {
      const alreadySent = await prisma.notification.findFirst({
        where: {
          userId: vac.userId,
          type: "VACATION_REMINDER",
          createdAt: { gte: today },
        },
      });

      if (!alreadySent) {
        await sendNotification({
          userId: vac.userId,
          type: "VACATION_REMINDER",
          title: "Konec dovolené zítra 🏖️",
          body: "Vaše dovolená končí zítra. Nezapomeňte se připravit na návrat!",
          link: "/requests",
        });
        results.vacationReminders++;
      }
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

    for (const poll of expiredPolls) {
      await prisma.poll.update({
        where: { id: poll.id },
        data: { isActive: false },
      });

      await sendPushToAll(
        "📊 Anketa ukončena",
        `Anketa „${poll.question}" skončila. Výsledky jsou k dispozici.`,
        "/polls",
      );

      results.closedPolls++;
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
