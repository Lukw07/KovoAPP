"use client";

import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import {
  Pin,
  MessageSquare,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PostTag {
  tag: { id: string; name: string; color: string | null };
}

interface PostAuthor {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  role?: string;
}

export interface NewsPost {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  imageUrl: string | null;
  isPinned: boolean;
  allowComments: boolean;
  publishedAt: Date;
  author: PostAuthor;
  tags: PostTag[];
  _count: { comments: number };
}

interface NewsCardProps {
  post: NewsPost;
}

export function NewsCard({ post }: NewsCardProps) {
  const [expanded, setExpanded] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(post.publishedAt), {
    addSuffix: true,
    locale: cs,
  });

  const preview = post.excerpt || post.content.slice(0, 200);
  const hasMore = post.content.length > 200;

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md card-hover",
        post.isPinned
          ? "border-blue-200 dark:border-blue-700/40 bg-blue-50/30 dark:bg-blue-900/10"
          : "border-border"
      )}
    >
      {/* Image banner */}
      {post.imageUrl && (
        <div className="relative h-40 w-full overflow-hidden rounded-t-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl}
            alt={post.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header row: pinned badge + tags */}
        <div className="flex flex-wrap items-center gap-2">
          {post.isPinned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <Pin className="h-3 w-3" />
              Připnuto
            </span>
          )}
          {post.tags.map(({ tag }) => (
            <span
              key={tag.id}
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: tag.color
                  ? `${tag.color}20`
                  : "rgb(241 245 249)",
                color: tag.color || "rgb(71 85 105)",
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>

        {/* Title */}
        <Link
          href={`/news/${post.id}`}
          className="block"
        >
          <h2 className="text-lg font-bold text-foreground leading-snug hover:text-accent transition-colors">
            {post.title}
          </h2>
        </Link>

        {/* Content */}
        <div
          className={cn(
            "prose prose-sm prose-slate dark:prose-invert max-w-none",
            !expanded && hasMore && "line-clamp-4"
          )}
        >
          {expanded ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          ) : (
            <p className="text-sm text-foreground-secondary">{preview}...</p>
          )}
        </div>

        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover active:scale-95 transition-all"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Skrýt
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Číst více
              </>
            )}
          </button>
        )}

        {/* Footer: author + time + comments */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-background-secondary">
              {post.author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.author.avatarUrl}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-foreground-muted" />
              )}
            </div>
            <div className="text-xs">
              <span className="font-medium text-foreground">
                {post.author.name || "Neznámý"}
              </span>
              <div className="flex items-center gap-1 text-foreground-muted">
                <Calendar className="h-3 w-3" />
                {timeAgo}
              </div>
            </div>
          </div>

          {post.allowComments && (
            <Link
              href={`/news/${post.id}`}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-foreground-secondary hover:bg-background-secondary active:scale-95 transition-all"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {post._count.comments}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
