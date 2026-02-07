"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ---------------------------------------------------------------------------
// GET NEWS FEED (pinned first, then by date)
// ---------------------------------------------------------------------------

export async function getNewsFeed(page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      skip,
      take: pageSize,
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true, role: true },
        },
        tags: {
          include: { tag: true },
        },
        _count: { select: { comments: true } },
      },
    }),
    prisma.post.count(),
  ]);

  return { posts, total, page, pageSize };
}

// ---------------------------------------------------------------------------
// GET SINGLE POST with comments
// ---------------------------------------------------------------------------

export async function getPostDetail(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: { id: true, name: true, avatarUrl: true, role: true },
      },
      tags: { include: { tag: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      },
    },
  });

  return post;
}

// ---------------------------------------------------------------------------
// GET ALL TAGS
// ---------------------------------------------------------------------------

export async function getAllTags() {
  return prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { posts: true } } },
  });
}

// ---------------------------------------------------------------------------
// GET LATEST NEWS (for dashboard widget)
// ---------------------------------------------------------------------------

export async function getLatestNews(count = 3) {
  return prisma.post.findMany({
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    take: count,
    include: {
      author: {
        select: { id: true, name: true, avatarUrl: true },
      },
      _count: { select: { comments: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// GET MY ROLE (for admin checks in client components)
// ---------------------------------------------------------------------------

export async function getMyRole() {
  const session = await auth();
  return session?.user?.role ?? null;
}
