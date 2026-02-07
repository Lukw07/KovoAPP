"use server";

import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// GET ACTIVE JOB POSTINGS (for employees)
// ---------------------------------------------------------------------------

export async function getActiveJobs() {
  return prisma.jobPosting.findMany({
    where: { status: "ACTIVE" },
    orderBy: { publishedAt: "desc" },
    include: {
      _count: { select: { referrals: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// GET ALL JOB POSTINGS (for admin)
// ---------------------------------------------------------------------------

export async function getAllJobs() {
  return prisma.jobPosting.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { referrals: true } },
      referrals: {
        orderBy: { createdAt: "desc" },
        include: {
          referrer: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// GET SINGLE JOB DETAIL
// ---------------------------------------------------------------------------

export async function getJobDetail(jobId: string) {
  return prisma.jobPosting.findUnique({
    where: { id: jobId },
    include: {
      _count: { select: { referrals: true } },
    },
  });
}
