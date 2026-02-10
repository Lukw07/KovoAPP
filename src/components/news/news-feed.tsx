"use client";

import { useState, useCallback } from "react";
import { Newspaper, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { getNewsFeed } from "@/actions/news-queries";
import { NewsCard, type NewsPost } from "@/components/news/news-card";
import { cn } from "@/lib/utils";

const listVariants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.97,
    transition: { duration: 0.2 },
  },
};

interface NewsFeedProps {
  initialPosts: NewsPost[];
  initialTotal: number;
}

export function NewsFeed({ initialPosts, initialTotal }: NewsFeedProps) {
  const [posts, setPosts] = useState<NewsPost[]>(initialPosts);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const pageSize = 20;
  const hasMore = posts.length < total;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNewsFeed(1, pageSize);
      setPosts(data.posts as unknown as NewsPost[]);
      setTotal(data.total);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = async () => {
    const nextPage = page + 1;
    setLoading(true);
    try {
      const data = await getNewsFeed(nextPage, pageSize);
      setPosts((prev) => [
        ...prev,
        ...(data.posts as unknown as NewsPost[]),
      ]);
      setTotal(data.total);
      setPage(nextPage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Novinky</h1>
        <button
          onClick={refresh}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium",
            "text-foreground-secondary hover:bg-background-secondary active:scale-95 transition-all",
            "disabled:opacity-50"
          )}
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", loading && "animate-spin")}
          />
          Obnovit
        </button>
      </div>

      {/* Posts list */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <Newspaper className="mb-3 h-12 w-12 text-foreground-muted" />
          <p className="text-sm font-medium text-foreground-secondary">
            Žádné novinky k zobrazení
          </p>
        </div>
      ) : (
        <motion.div
          className="space-y-4"
          variants={listVariants}
          initial="initial"
          animate="animate"
        >
          {posts.map((post, i) => (
            <motion.div key={post.id} variants={cardVariants}>
              <NewsCard
                post={post}
              />
            </motion.div>
          ))}

          {/* Load more */}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className={cn(
                "w-full rounded-2xl border border-border bg-card py-3",
                "text-sm font-medium text-foreground-secondary",
                "hover:bg-card-hover active:scale-[0.99] transition-all",
                "disabled:opacity-50"
              )}
            >
              {loading ? "Načítání..." : "Zobrazit další"}
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}
