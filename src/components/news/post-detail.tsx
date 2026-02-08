"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import { Send, User, ArrowLeft, MessageSquare, Pin } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { addComment } from "@/actions/news";
import { cn } from "@/lib/utils";

interface CommentData {
  id: string;
  content: string;
  createdAt: Date;
  author: { id: string; name: string | null; avatarUrl: string | null };
}

interface PostDetailData {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  isPinned: boolean;
  allowComments: boolean;
  publishedAt: Date;
  author: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    role?: string;
  };
  tags: Array<{ tag: { id: string; name: string; color: string | null } }>;
  comments: CommentData[];
}

interface PostDetailProps {
  post: PostDetailData;
  onBack: () => void;
}

export function PostDetail({ post, onBack }: PostDetailProps) {
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [comments, setComments] = useState<CommentData[]>(post.comments);

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    setError(null);

    const fd = new FormData();
    fd.set("postId", post.id);
    fd.set("content", commentText.trim());

    startTransition(async () => {
      const result = await addComment(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setCommentText("");
        // Optimistic: add to local state
        setComments((prev) => [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            content: commentText.trim(),
            createdAt: new Date(),
            author: { id: "", name: "Vy", avatarUrl: null },
          },
        ]);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 active:scale-95 transition-all"
      >
        <ArrowLeft className="h-4 w-4" />
        Zpět na novinky
      </button>

      {/* Article */}
      <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        {post.imageUrl && (
          <div className="relative h-48 w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.imageUrl}
              alt={post.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="p-4 space-y-4">
          {/* Badge + tags */}
          <div className="flex flex-wrap items-center gap-2">
            {post.isPinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
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

          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{post.title}</h1>

          {/* Author + date */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
              {post.author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.author.avatarUrl}
                  alt=""
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <User className="h-3.5 w-3.5 text-slate-400" />
              )}
            </div>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {post.author.name}
            </span>
            <span>·</span>
            <span>
              {formatDistanceToNow(new Date(post.publishedAt), {
                addSuffix: true,
                locale: cs,
              })}
            </span>
          </div>

          {/* Markdown content */}
          <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>
        </div>
      </article>

      {/* Comments section */}
      {post.allowComments && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <MessageSquare className="h-4 w-4" />
            Komentáře ({comments.length})
          </h3>

          {/* Comment list */}
          <div className="space-y-2">
            {comments.length === 0 && (
              <p className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4 text-center text-sm text-slate-400 dark:text-slate-500">
                Zatím žádné komentáře. Buďte první!
              </p>
            )}
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 space-y-1"
              >
                <div className="flex items-center gap-2 text-xs">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                    {comment.author.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={comment.author.avatarUrl}
                        alt=""
                        className="h-5 w-5 rounded-full"
                      />
                    ) : (
                      <User className="h-3 w-3 text-slate-400" />
                    )}
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {comment.author.name}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                      locale: cs,
                    })}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{comment.content}</p>
              </div>
            ))}
          </div>

          {/* Add comment */}
          <div className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitComment();
                }
              }}
              placeholder="Napište komentář..."
              className={cn(
                "flex-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm",
                "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900",
                "placeholder:text-slate-400 dark:placeholder:text-slate-500",
                "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              )}
              disabled={isPending}
            />
            <button
              onClick={handleSubmitComment}
              disabled={isPending || !commentText.trim()}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                "bg-blue-600 text-white shadow-sm",
                "hover:bg-blue-700 active:scale-95 transition-all",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
