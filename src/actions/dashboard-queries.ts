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
