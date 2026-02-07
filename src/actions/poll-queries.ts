"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ---------------------------------------------------------------------------
// GET ALL POLLS (active first, then by date)
// ---------------------------------------------------------------------------

export async function getPolls() {
  const session = await auth();
  const userId = session?.user?.id;

  const polls = await prisma.poll.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: {
      creator: {
        select: { id: true, name: true, avatarUrl: true },
      },
      votes: true,
    },
  });

  return polls.map((poll) => {
    const options = poll.options as Array<{ index: number; text: string }>;
    const totalVotes = poll.votes.length;

    // Count votes per option
    const voteCounts = options.map((opt) => ({
      ...opt,
      count: poll.votes.filter((v) => v.optionIndex === opt.index).length,
    }));

    // Check if current user has voted
    const userVotes = userId
      ? poll.votes
          .filter((v) => v.userId === userId)
          .map((v) => v.optionIndex)
      : [];

    // Check if expired
    const isExpired = poll.activeUntil
      ? new Date() > new Date(poll.activeUntil)
      : false;

    return {
      id: poll.id,
      question: poll.question,
      description: poll.description,
      isAnonymous: poll.isAnonymous,
      isMultiple: poll.isMultiple,
      isActive: poll.isActive && !isExpired,
      activeUntil: poll.activeUntil,
      createdAt: poll.createdAt,
      creator: poll.creator,
      options: voteCounts,
      totalVotes,
      userVotes,
      hasVoted: userVotes.length > 0,
    };
  });
}

// ---------------------------------------------------------------------------
// GET SINGLE POLL
// ---------------------------------------------------------------------------

export async function getPollDetail(pollId: string) {
  const session = await auth();
  const userId = session?.user?.id;

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      creator: {
        select: { id: true, name: true, avatarUrl: true },
      },
      votes: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!poll) return null;

  const options = poll.options as Array<{ index: number; text: string }>;
  const totalVotes = poll.votes.length;

  const voteCounts = options.map((opt) => ({
    ...opt,
    count: poll.votes.filter((v) => v.optionIndex === opt.index).length,
    voters: poll.isAnonymous
      ? []
      : poll.votes
          .filter((v) => v.optionIndex === opt.index)
          .map((v) => v.user),
  }));

  const userVotes = userId
    ? poll.votes
        .filter((v) => v.userId === userId)
        .map((v) => v.optionIndex)
    : [];

  const isExpired = poll.activeUntil
    ? new Date() > new Date(poll.activeUntil)
    : false;

  return {
    id: poll.id,
    question: poll.question,
    description: poll.description,
    isAnonymous: poll.isAnonymous,
    isMultiple: poll.isMultiple,
    isActive: poll.isActive && !isExpired,
    activeUntil: poll.activeUntil,
    createdAt: poll.createdAt,
    creator: poll.creator,
    options: voteCounts,
    totalVotes,
    userVotes,
    hasVoted: userVotes.length > 0,
  };
}

// ---------------------------------------------------------------------------
// GET ACTIVE POLLS COUNT (for dashboard)
// ---------------------------------------------------------------------------

export async function getActivePollsCount() {
  return prisma.poll.count({
    where: {
      isActive: true,
      OR: [{ activeUntil: null }, { activeUntil: { gt: new Date() } }],
    },
  });
}
