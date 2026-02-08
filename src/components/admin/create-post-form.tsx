"use client";

import { useState, useTransition, useRef } from "react";
import { Plus, X, Send, Eye, ImagePlus, Trash2 } from "lucide-react";
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
  const [isPinned, setIsPinned] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Vyberte prosím obrázek");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Obrázek je příliš velký (max 10 MB)");
      return;
    }

    setError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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

    startTransition(async () => {
      try {
        // Step 1: Upload image if present
        let imageUrl = "";
        if (imageFile) {
          setUploading(true);
          const uploadFd = new FormData();
          uploadFd.append("file", imageFile);
          const res = await fetch("/api/upload", { method: "POST", body: uploadFd });
          const data = await res.json();
          setUploading(false);

          if (!res.ok || data.error) {
            setError(data.error || "Chyba při nahrávání obrázku");
            return;
          }
          imageUrl = data.url;
        }

        // Step 2: Create the post
        const fd = new FormData();
        fd.set("title", title);
        fd.set("content", content);
        fd.set("excerpt", excerpt);
        fd.set("imageUrl", imageUrl);
        fd.set("isPinned", String(isPinned));
        fd.set("allowComments", String(allowComments));
        tags.forEach((tag) => fd.append("tags", tag));

        const result = await createPost(fd);
        if (result.error) {
          setError(result.error);
        } else {
          setSuccess(true);
          setTitle("");
          setContent("");
          setExcerpt("");
          setIsPinned(false);
          setAllowComments(true);
          setTags([]);
          removeImage();
          onSuccess?.();
        }
      } catch {
        setError("Něco se pokazilo, zkuste to znovu");
        setUploading(false);
      }
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <h3 className="text-base font-bold text-foreground">
        Nový příspěvek
      </h3>

      {/* Title */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground-secondary">
          Nadpis *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Název příspěvku..."
          className={cn(
            "w-full rounded-xl border border-border px-3 py-2.5 text-sm bg-card text-foreground",
            "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
          )}
        />
      </div>

      {/* Content with preview toggle */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-foreground-secondary">
            Obsah (Markdown) *
          </label>
          <button
            onClick={() => setPreview(!preview)}
            className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
          >
            <Eye className="h-3 w-3" />
            {preview ? "Editor" : "Náhled"}
          </button>
        </div>
        {preview ? (
          <div className="min-h-[160px] rounded-xl border border-border p-3 prose prose-sm prose-slate dark:prose-invert max-w-none">
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            ) : (
              <p className="text-foreground-muted italic">
                Prázdný obsah
              </p>
            )}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Podporuje **Markdown** formátování..."
            rows={6}
            className={cn(
              "w-full rounded-xl border border-border px-3 py-2.5 text-sm resize-none bg-card text-foreground",
              "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
              "font-mono",
            )}
          />
        )}
      </div>

      {/* Excerpt */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground-secondary">
          Krátký popis (volitelné)
        </label>
        <input
          type="text"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Zobrazí se v náhledu karty..."
          className={cn(
            "w-full rounded-xl border border-border px-3 py-2.5 text-sm bg-card text-foreground",
            "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
          )}
        />
      </div>

      {/* Image Upload (replaces old URL input) */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground-secondary">
          Obrázek (volitelné, max 10 MB)
        </label>

        {imagePreview ? (
          <div className="relative rounded-xl overflow-hidden border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Náhled"
              className="w-full max-h-48 object-cover"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-full flex flex-col items-center justify-center gap-1.5 rounded-xl py-4",
              "border-2 border-dashed border-border",
              "text-foreground-muted",
              "hover:border-accent hover:text-accent",
              "transition-all cursor-pointer active:scale-[0.99]",
            )}
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-xs font-medium">
              Klepněte pro výběr obrázku
            </span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          className="hidden"
          onChange={handleImageSelect}
        />
      </div>

      {/* Tags */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground-secondary">
          Štítky
        </label>
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
              "flex-1 rounded-xl border border-border px-3 py-2 text-sm bg-card text-foreground",
              "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
            )}
          />
          <button
            type="button"
            onClick={addTag}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-background-secondary text-foreground-secondary hover:bg-border active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-accent-light px-2.5 py-0.5 text-xs font-medium text-accent-text"
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
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
          />
          Připnout nahoře
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={allowComments}
            onChange={(e) => setAllowComments(e.target.checked)}
            className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
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
        disabled={isPending || uploading || !title.trim() || !content.trim()}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-xl py-3",
          "bg-accent text-white text-sm font-semibold shadow-accent glow-blue",
          "hover:bg-accent-hover active:scale-[0.99] transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        )}
      >
        <Send className="h-4 w-4" />
        {uploading
          ? "Nahrávám obrázek..."
          : isPending
            ? "Odesílám..."
            : "Publikovat příspěvek"}
      </button>
    </div>
  );
}
