"use server";

/**
 * Dashboard-specific queries for the activity feed.
 * Aggregates recent activity across all modules.
 */

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export interface ActivityItem {
  id: string;
  type: "news" | "poll" | "points" | "reservation" | "hr_approved" | "job" | "reward";
  title: string;
  description: string;
  link: string;
  timestamp: Date;
  icon: string; // icon name for client rendering
  color: string; // tailwind color
}

/**
 * Get recent activity across the whole app for the dashboard feed.
 * Returns a mixed timeline of the latest events.
 */
export async function getDashboardActivity(limit = 8): Promise<ActivityItem[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [latestNews, latestPolls, recentPoints, recentJobs, activePollCount] =
    await Promise.all([
      // Latest news posts
      prisma.post.findMany({
        where: { publishedAt: { gte: sevenDaysAgo } },
        orderBy: { publishedAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          publishedAt: true,
          author: { select: { name: true } },
        },
      }),

      // Latest polls
      prisma.poll.findMany({
        where: {
          createdAt: { gte: sevenDaysAgo },
          isActive: true,
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          question: true,
          createdAt: true,
          _count: { select: { votes: true } },
        },
      }),

      // Recent point transactions for this user
      prisma.pointTransaction.findMany({
        where: {
          userId: session.user.id,
          createdAt: { gte: sevenDaysAgo },
          amount: { gt: 0 },
        },
        orderBy: { createdAt: "desc" },
        take: 2,
        select: {
          id: true,
          amount: true,
          reason: true,
          createdAt: true,
        },
      }),

      // Recent job postings
      prisma.jobPosting.findMany({
        where: {
          status: "ACTIVE",
          publishedAt: { gte: sevenDaysAgo },
        },
        orderBy: { publishedAt: "desc" },
        take: 2,
        select: {
          id: true,
          title: true,
          publishedAt: true,
        },
      }),

      // Active polls count
      prisma.poll.count({
        where: {
          isActive: true,
          OR: [{ activeUntil: null }, { activeUntil: { gt: now } }],
        },
      }),
    ]);

  const items: ActivityItem[] = [];

  // Map news
  for (const post of latestNews) {
    items.push({
      id: `news-${post.id}`,
      type: "news",
      title: "Nový příspěvek",
      description: post.title,
      link: `/news/${post.id}`,
      timestamp: post.publishedAt,
      icon: "Newspaper",
      color: "blue",
    });
  }

  // Map polls
  for (const poll of latestPolls) {
    items.push({
      id: `poll-${poll.id}`,
      type: "poll",
      title: "Nová anketa",
      description: poll.question,
      link: "/polls",
      timestamp: poll.createdAt,
      icon: "ChartBar",
      color: "violet",
    });
  }

  // Map points
  for (const tx of recentPoints) {
    items.push({
      id: `points-${tx.id}`,
      type: "points",
      title: `+${tx.amount} bodů`,
      description: tx.reason,
      link: "/rewards",
      timestamp: tx.createdAt,
      icon: "Star",
      color: "amber",
    });
  }

  // Map jobs
  for (const job of recentJobs) {
    items.push({
      id: `job-${job.id}`,
      type: "job",
      title: "Nová pozice",
      description: job.title,
      link: `/jobs/${job.id}`,
      timestamp: job.publishedAt ?? new Date(),
      icon: "Briefcase",
      color: "emerald",
    });
  }

  // Sort by timestamp descending and take the limit
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return items.slice(0, limit);
}

/**
 * Get dashboard summary stats.
 */
export async function getDashboardStats() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const now = new Date();

  const [activePollCount, unreadNotifications, pendingReservations] =
    await Promise.all([
      prisma.poll.count({
        where: {
          isActive: true,
          OR: [{ activeUntil: null }, { activeUntil: { gt: now } }],
        },
      }),
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false },
      }),
      prisma.reservation.count({
        where: {
          userId: session.user.id,
          status: "PENDING",
        },
      }),
    ]);

  return {
    activePollCount,
    unreadNotifications,
    pendingReservations,
  };
}

// ---------------------------------------------------------------------------
// Upcoming items — what awaits the current user
// ---------------------------------------------------------------------------

export interface UpcomingItem {
  id: string;
  type: "reservation" | "hr_request" | "pending_approval";
  title: string;
  description: string;
  link: string;
  date: Date;
  status: string;
}

export async function getUpcomingItems(): Promise<UpcomingItem[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const now = new Date();
  const isManagement =
    session.user.role === "ADMIN" || session.user.role === "MANAGER";

  const items: UpcomingItem[] = [];

  // 1. My upcoming confirmed reservations
  const upcomingReservations = await prisma.reservation.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      endTime: { gt: now },
    },
    include: {
      resource: { select: { name: true, type: true } },
    },
    orderBy: { startTime: "asc" },
    take: 5,
  });

  for (const r of upcomingReservations) {
    const startDate = new Date(r.startTime);
    const statusLabel = r.status === "PENDING" ? "Čeká na schválení" : "Potvrzeno";
    items.push({
      id: `res-${r.id}`,
      type: "reservation",
      title: r.resource.name,
      description: `${statusLabel} • ${startDate.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })} ${startDate.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}`,
      link: "/reservations",
      date: startDate,
      status: r.status,
    });
  }

  // 2. My pending HR requests
  const myPendingRequests = await prisma.hrRequest.findMany({
    where: {
      userId: session.user.id,
      status: "PENDING",
    },
    orderBy: { startDate: "asc" },
    take: 5,
  });

  const typeLabels: Record<string, string> = {
    VACATION: "Dovolená",
    SICK_DAY: "Sick day",
    DOCTOR: "Návštěva lékaře",
    PERSONAL_DAY: "Osobní volno",
    HOME_OFFICE: "Home office",
  };

  for (const req of myPendingRequests) {
    items.push({
      id: `hr-${req.id}`,
      type: "hr_request",
      title: typeLabels[req.type] ?? req.type,
      description: `Čeká na schválení • ${new Date(req.startDate).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })}`,
      link: "/requests",
      date: new Date(req.startDate),
      status: "PENDING",
    });
  }

  // 3. For managers: pending requests to approve
  if (isManagement) {
    const pendingForApproval = await prisma.hrRequest.findMany({
      where: {
        status: "PENDING",
        userId: { not: session.user.id },
      },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { startDate: "asc" },
      take: 5,
    });

    for (const req of pendingForApproval) {
      items.push({
        id: `approve-${req.id}`,
        type: "pending_approval",
        title: `${req.user.name} — ${typeLabels[req.type] ?? req.type}`,
        description: `Ke schválení • ${new Date(req.startDate).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })}`,
        link: "/requests",
        date: new Date(req.startDate),
        status: "PENDING",
      });
    }
  }

  // Sort by date ascending (soonest first)
  items.sort((a, b) => a.date.getTime() - b.date.getTime());

  return items.slice(0, 10);
}
