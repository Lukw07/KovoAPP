"use client";

import { useState, useTransition, useRef } from "react";
import { Plus, Send, X, ImagePlus, Trash2 } from "lucide-react";
import { createListing } from "@/actions/marketplace";
import { cn } from "@/lib/utils";

const MAX_IMAGES = 5;

interface UploadedImage {
  url: string;
  thumbUrl?: string;
  preview: string; // object URL for local preview
  file?: File;
}

interface CreateListingFormProps {
  onSuccess?: () => void;
}

export function CreateListingForm({ onSuccess }: CreateListingFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [open, setOpen] = useState(false);

  // Multi-image state
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setError(`Maximálně ${MAX_IMAGES} fotek`);
      return;
    }

    const toAdd = files.slice(0, remaining);
    const invalid = toAdd.find((f) => !f.type.startsWith("image/"));
    if (invalid) {
      setError("Vyberte prosím obrázky (JPG, PNG, WebP, GIF)");
      return;
    }

    const tooLarge = toAdd.find((f) => f.size > 10 * 1024 * 1024);
    if (tooLarge) {
      setError("Obrázek je příliš velký (max 10 MB)");
      return;
    }

    setError(null);
    const newImages: UploadedImage[] = toAdd.map((file) => ({
      url: "",
      preview: URL.createObjectURL(file),
      file,
    }));
    setImages((prev) => [...prev, ...newImages]);

    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const removed = prev[index];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const resetForm = () => {
    images.forEach((img) => {
      if (img.preview) URL.revokeObjectURL(img.preview);
    });
    setImages([]);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const form = e.currentTarget;
    const fd = new FormData(form);

    startTransition(async () => {
      try {
        // Step 1: Upload all images
        const uploadedImages: { url: string; thumbUrl?: string; order: number }[] = [];

        if (images.length > 0) {
          setUploading(true);

          for (let i = 0; i < images.length; i++) {
            const img = images[i];
            if (!img.file) continue;

            const uploadFd = new FormData();
            uploadFd.append("file", img.file);

            const res = await fetch("/api/upload", {
              method: "POST",
              body: uploadFd,
            });

            const data = await res.json();

            if (!res.ok || data.error) {
              setError(data.error || `Chyba při nahrávání obrázku ${i + 1}`);
              setUploading(false);
              return;
            }

            uploadedImages.push({
              url: data.url,
              thumbUrl: data.thumbUrl,
              order: i,
            });
          }

          setUploading(false);
        }

        // Step 2: Create listing with images JSON
        if (uploadedImages.length > 0) {
          fd.set("images", JSON.stringify(uploadedImages));
          fd.set("imageUrl", uploadedImages[0].url); // cover
        }
        fd.delete("imageFile");

        const result = await createListing(fd);
        if (result.error) {
          setError(result.error);
        } else {
          setSuccess(true);
          form.reset();
          resetForm();
          onSuccess?.();
          setTimeout(() => {
            setOpen(false);
            setSuccess(false);
          }, 1500);
        }
      } catch {
        setError("Něco se pokazilo, zkuste to znovu");
        setUploading(false);
      }
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-2xl py-3",
          "border-2 border-dashed border-slate-300 dark:border-slate-600",
          "text-sm font-medium text-slate-500 dark:text-slate-400",
          "hover:border-blue-300 hover:text-blue-600 active:scale-[0.99] transition-all",
        )}
      >
        <Plus className="h-4 w-4" />
        Přidat inzerát
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 animate-fadeInUp"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Nový inzerát
        </h3>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            resetForm();
          }}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Category */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Kategorie *
        </label>
        <select
          name="category"
          required
          className={cn(
            "w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200",
            "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900",
          )}
        >
          <option value="SELLING">Prodám</option>
          <option value="BUYING">Koupím</option>
          <option value="LOOKING_FOR">Hledám</option>
          <option value="OFFERING">Nabízím</option>
        </select>
      </div>

      {/* Title */}
      <input
        name="title"
        required
        placeholder="Název *"
        className={cn(
          "w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-200",
          "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900",
        )}
      />

      {/* Description */}
      <textarea
        name="description"
        required
        rows={3}
        placeholder="Popis *"
        className={cn(
          "w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm resize-none dark:bg-slate-700 dark:text-slate-200",
          "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900",
        )}
      />

      {/* Price */}
      <input
        name="price"
        placeholder="Cena (volitelné, např. 500 Kč, Zdarma, Dohodou)"
        className={cn(
          "w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-200",
          "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900",
        )}
      />

      {/* Multi-Image Upload */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Fotky (max {MAX_IMAGES}, max 10 MB/ks)
        </label>

        {/* Image previews grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, idx) => (
              <div
                key={idx}
                className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.preview}
                  alt={`Fotka ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
                {idx === 0 && (
                  <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md">
                    Hlavní
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add more button */}
        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-full flex flex-col items-center justify-center gap-1.5 rounded-xl",
              images.length > 0 ? "py-3" : "py-6",
              "border-2 border-dashed border-slate-200 dark:border-slate-600",
              "text-slate-400 dark:text-slate-500",
              "hover:border-blue-300 hover:text-blue-500 dark:hover:border-blue-600 dark:hover:text-blue-400",
              "transition-all cursor-pointer active:scale-[0.99]",
            )}
          >
            <ImagePlus className={images.length > 0 ? "h-5 w-5" : "h-6 w-6"} />
            <span className="text-xs font-medium">
              {images.length > 0
                ? `Přidat další (${images.length}/${MAX_IMAGES})`
                : "Klepněte pro výběr fotek"}
            </span>
            {images.length === 0 && (
              <span className="text-[10px] text-slate-300 dark:text-slate-600">
                JPG, PNG, WebP, GIF · max 10 MB · až {MAX_IMAGES} fotek
              </span>
            )}
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          name="imageFile"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          multiple
          className="hidden"
          onChange={handleImageSelect}
        />
      </div>

      {/* Error / Success */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2 animate-fadeInUp">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg px-3 py-2 animate-fadeInUp">
          ✓ Inzerát vytvořen!
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || uploading}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-xl py-2.5",
          "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold",
          "hover:bg-slate-800 dark:hover:bg-slate-200 active:scale-[0.99] transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        )}
      >
        <Send className="h-4 w-4" />
        {uploading
          ? "Nahrávám fotky..."
          : isPending
            ? "Vytvářím..."
            : "Přidat"}
      </button>
    </form>
  );
}
