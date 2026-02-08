"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ============================================================================
// Global Search — searches across posts, marketplace listings, job postings
// ============================================================================

export interface SearchResult {
  id: string;
  type: "post" | "listing" | "job";
  title: string;
  excerpt: string;
  link: string;
  createdAt: Date;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  try {
    // Run all three searches in parallel
    const [posts, listings, jobs] = await Promise.all([
      // Search posts
      prisma.post.findMany({
        where: {
          OR: [
            { title: { contains: trimmed, mode: "insensitive" } },
            { content: { contains: trimmed, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          excerpt: true,
          content: true,
          createdAt: true,
        },
        orderBy: { publishedAt: "desc" },
        take: 5,
      }),

      // Search marketplace listings
      prisma.marketplaceListing.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: trimmed, mode: "insensitive" } },
            { description: { contains: trimmed, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // Search job postings
      prisma.jobPosting.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { title: { contains: trimmed, mode: "insensitive" } },
            { description: { contains: trimmed, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
        },
        orderBy: { publishedAt: "desc" },
        take: 5,
      }),
    ]);

    const results: SearchResult[] = [
      ...posts.map((p) => ({
        id: p.id,
        type: "post" as const,
        title: p.title,
        excerpt: p.excerpt || (p.content.length > 120 ? p.content.slice(0, 120) + "…" : p.content),
        link: `/news/${p.id}`,
        createdAt: p.createdAt,
      })),
      ...listings.map((l) => ({
        id: l.id,
        type: "listing" as const,
        title: l.title,
        excerpt: l.description.length > 120 ? l.description.slice(0, 120) + "…" : l.description,
        link: `/marketplace/${l.id}`,
        createdAt: l.createdAt,
      })),
      ...jobs.map((j) => ({
        id: j.id,
        type: "job" as const,
        title: j.title,
        excerpt: (j.description ?? "").length > 120
          ? (j.description ?? "").slice(0, 120) + "…"
          : j.description ?? "",
        link: `/jobs/${j.id}`,
        createdAt: j.createdAt,
      })),
    ];

    // Sort by relevance (title match first, then by date)
    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(trimmed.toLowerCase());
      const bTitle = b.title.toLowerCase().includes(trimmed.toLowerCase());
      if (aTitle && !bTitle) return -1;
      if (!aTitle && bTitle) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return results.slice(0, 15);
  } catch (err) {
    console.error("globalSearch error:", err);
    return [];
  }
}
