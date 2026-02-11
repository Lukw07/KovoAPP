"use server";

// ============================================================================
// My Data — GDPR self-service (Art. 15, 17, 20)
// Export personal data, request account deletion
// ============================================================================

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { headers } from "next/headers";
import { getClientIp } from "@/lib/security";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

// ---------------------------------------------------------------------------
// Export all personal data (Art. 15 + 20)
// ---------------------------------------------------------------------------

export async function exportMyData() {
  const sessionUser = await requireUser();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      position: true,
      phone: true,
      avatarUrl: true,
      hireDate: true,
      isActive: true,
      pointsBalance: true,
      workFundType: true,
      createdAt: true,
      updatedAt: true,

      department: {
        select: { name: true, code: true },
      },

      // Vacation entitlements
      vacationEntitlements: {
        orderBy: { year: "desc" },
        select: {
          year: true,
          totalDays: true,
          usedDays: true,
          carriedOver: true,
          totalHours: true,
          usedHours: true,
          carriedOverHours: true,
        },
      },

      // HR requests
      hrRequests: {
        orderBy: { createdAt: "desc" },
        select: {
          type: true,
          status: true,
          startDate: true,
          endDate: true,
          isHalfDayStart: true,
          isHalfDayEnd: true,
          totalDays: true,
          totalHours: true,
          reason: true,
          isOverLimit: true,
          createdAt: true,
        },
      },

      // Contracts (without salary — handled separately with encryption)
      contracts: {
        orderBy: { startDate: "desc" },
        select: {
          type: true,
          status: true,
          startDate: true,
          endDate: true,
          position: true,
          hoursPerWeek: true,
          createdAt: true,
        },
      },

      // Medical exams (without detailed result — sensitive)
      medicalExams: {
        orderBy: { scheduledAt: "desc" },
        select: {
          type: true,
          status: true,
          scheduledAt: true,
          completedAt: true,
          nextDueAt: true,
          doctorName: true,
          createdAt: true,
        },
      },

      // Documents
      documents: {
        orderBy: { createdAt: "desc" },
        select: {
          title: true,
          category: true,
          description: true,
          createdAt: true,
        },
      },

      // Reservations
      reservations: {
        orderBy: { startTime: "desc" },
        take: 100,
        select: {
          status: true,
          startTime: true,
          endTime: true,
          note: true,
          resource: { select: { name: true, type: true } },
          createdAt: true,
        },
      },

      // Reward claims
      rewardClaims: {
        orderBy: { createdAt: "desc" },
        select: {
          status: true,
          createdAt: true,
          reward: { select: { name: true, pointsCost: true } },
        },
      },

      // Points history
      pointsReceived: {
        orderBy: { createdAt: "desc" },
        select: {
          amount: true,
          reason: true,
          category: true,
          createdAt: true,
        },
      },

      // Referrals (as referrer)
      referrals: {
        orderBy: { createdAt: "desc" },
        select: {
          candidateName: true,
          status: true,
          createdAt: true,
          jobPosting: { select: { title: true } },
        },
      },

      // FCM tokens (device info)
      fcmTokens: {
        where: { isActive: true },
        select: {
          deviceType: true,
          deviceName: true,
          createdAt: true,
        },
      },

      // Calendar events
      calendarEvents: {
        orderBy: { date: "desc" },
        take: 50,
        select: {
          title: true,
          date: true,
          visibility: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) throw new Error("User not found");

  const headersList = await headers();
  const ip = getClientIp(headersList);

  await logAudit({
    action: "DATA_EXPORT",
    entityType: "User",
    entityId: sessionUser.id,
    performedBy: sessionUser.id,
    details: { exportedAt: new Date().toISOString(), ip },
  });

  return {
    exportDate: new Date().toISOString(),
    gdprInfo: {
      controller: "KOVO Apka — interní portál",
      contact: "podpora@kovoapp.cz",
      purpose:
        "Export osobních údajů dle čl. 15 a 20 GDPR (právo na přístup a přenositelnost dat)",
    },
    personalData: user,
  };
}

// ---------------------------------------------------------------------------
// Request account deletion (Art. 17)
// ---------------------------------------------------------------------------

export async function requestAccountDeletion(reason?: string) {
  const sessionUser = await requireUser();

  // Prevent the last admin from requesting deletion
  if (sessionUser.role === "ADMIN") {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN", isActive: true },
    });
    if (adminCount <= 1) {
      return {
        error:
          "Jste posledním aktivním administrátorem. Před zrušením účtu předejte roli jinému uživateli.",
      };
    }
  }

  // Notify all admins about the deletion request
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true, id: { not: sessionUser.id } },
    select: { id: true },
  });

  const userName = sessionUser.name ?? sessionUser.email;

  for (const admin of admins) {
    await sendNotification({
      userId: admin.id,
      type: "SYSTEM",
      title: "🗑️ Žádost o výmaz účtu",
      body: `${userName} požádal/a o výmaz svého účtu.${reason ? ` Důvod: ${reason}` : ""}`,
      link: "/admin/employees",
    });
  }

  const headersList = await headers();
  const ip = getClientIp(headersList);

  await logAudit({
    action: "DELETION_REQUEST",
    entityType: "User",
    entityId: sessionUser.id,
    performedBy: sessionUser.id,
    details: {
      reason: reason ?? "Neuvedeno",
      requestedAt: new Date().toISOString(),
      ip,
    },
  });

  return {
    success: true,
    message:
      "Vaše žádost o výmaz účtu byla odeslána. Administrátor ji zpracuje do 30 dnů dle čl. 17 GDPR.",
  };
}
