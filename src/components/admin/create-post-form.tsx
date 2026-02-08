"use client";

import { useState, useTransition } from "react";
import { Plus, X, Send, Eye } from "lucide-react";
import { createPost } from "@/actions/news";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface CreatePostFormProps {
  onSuccess?: () => void;
}

export function CreatePostForm({ onSuccess }: CreatePostFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [preview, setPreview] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = () => {
    setError(null);
    setSuccess(false);

    const fd = new FormData();
    fd.set("title", title);
    fd.set("content", content);
    fd.set("excerpt", excerpt);
    fd.set("imageUrl", imageUrl);
    fd.set("isPinned", String(isPinned));
    fd.set("allowComments", String(allowComments));
    tags.forEach((tag) => fd.append("tags", tag));

    startTransition(async () => {
      const result = await createPost(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        // Reset form
        setTitle("");
        setContent("");
        setExcerpt("");
        setImageUrl("");
        setIsPinned(false);
        setAllowComments(true);
        setTags([]);
        onSuccess?.();
      }
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
        Nový příspěvek
      </h3>

      {/* Title */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Nadpis *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Název příspěvku..."
          className={cn(
            "w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-200",
            "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
          )}
        />
      </div>

      {/* Content with preview toggle */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Obsah (Markdown) *
          </label>
          <button
            onClick={() => setPreview(!preview)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
          >
            <Eye className="h-3 w-3" />
            {preview ? "Editor" : "Náhled"}
          </button>
        </div>
        {preview ? (
          <div className="min-h-[160px] rounded-xl border border-slate-200 dark:border-slate-600 p-3 prose prose-sm prose-slate dark:prose-invert max-w-none">
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            ) : (
              <p className="text-slate-400 dark:text-slate-500 italic">Prázdný obsah</p>
            )}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Podporuje **Markdown** formátování..."
            rows={6}
            className={cn(
              "w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm resize-none dark:bg-slate-700 dark:text-slate-200",
              "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900",
              "font-mono"
            )}
          />
        )}
      </div>

      {/* Excerpt */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Krátký popis (volitelné)
        </label>
        <input
          type="text"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Zobrazí se v náhledu karty..."
          className={cn(
            "w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-200",
            "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
          )}
        />
      </div>

      {/* Image URL */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          URL obrázku (volitelné)
        </label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          className={cn(
            "w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-200",
            "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
          )}
        />
      </div>

      {/* Tags */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Štítky</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Přidat štítek..."
            className={cn(
              "flex-1 rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-slate-200",
              "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
            )}
          />
          <button
            type="button"
            onClick={addTag}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="hover:text-blue-900 dark:hover:text-blue-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
          />
          Připnout nahoře
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={allowComments}
            onChange={(e) => setAllowComments(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
          />
          Povolit komentáře
        </label>
      </div>

      {/* Error / Success */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg px-3 py-2">
          Příspěvek byl úspěšně vytvořen!
        </p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isPending || !title.trim() || !content.trim()}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-xl py-3",
          "bg-blue-600 text-white text-sm font-semibold shadow-sm",
          "hover:bg-blue-700 active:scale-[0.99] transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <Send className="h-4 w-4" />
        {isPending ? "Odesílám..." : "Publikovat příspěvek"}
      </button>
    </div>
  );
}
