"use client";

import { useState, useEffect, useCallback } from "react";
import { Newspaper, RefreshCw } from "lucide-react";
import { getNewsFeed, getPostDetail } from "@/actions/news-queries";
import { NewsCard, type NewsPost } from "@/components/news/news-card";
import { PostDetail } from "@/components/news/post-detail";
import { cn } from "@/lib/utils";

interface NewsFeedProps {
  initialPosts: NewsPost[];
  initialTotal: number;
}

export function NewsFeed({ initialPosts, initialTotal }: NewsFeedProps) {
  const [posts, setPosts] = useState<NewsPost[]>(initialPosts);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [postDetail, setPostDetail] = useState<any>(null);

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

  const openDetail = useCallback(async (postId: string) => {
    setSelectedPostId(postId);
    const detail = await getPostDetail(postId);
    setPostDetail(detail);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedPostId(null);
    setPostDetail(null);
    // Refresh to pick up new comments
    refresh();
  }, [refresh]);

  // Pull-to-refresh placeholder
  useEffect(() => {
    // Could implement pull-to-refresh gesture here
  }, []);

  // Detail view
  if (selectedPostId && postDetail) {
    return <PostDetail post={postDetail} onBack={closeDetail} />;
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Novinky</h1>
        <button
          onClick={refresh}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium",
            "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all",
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
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-16 text-center">
          <Newspaper className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Žádné novinky k zobrazení
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <NewsCard
              key={post.id}
              post={post}
              onOpenDetail={openDetail}
            />
          ))}

          {/* Load more */}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className={cn(
                "w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-3",
                "text-sm font-medium text-slate-600 dark:text-slate-300",
                "hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.99] transition-all",
                "disabled:opacity-50"
              )}
            >
              {loading ? "Načítání..." : "Zobrazit další"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
