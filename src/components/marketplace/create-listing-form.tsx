"use client";

import { useState, useTransition } from "react";
import { Plus, Send, X } from "lucide-react";
import { createListing } from "@/actions/marketplace";
import { cn } from "@/lib/utils";

interface CreateListingFormProps {
  onSuccess?: () => void;
}

export function CreateListingForm({ onSuccess }: CreateListingFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const form = e.currentTarget;
    const fd = new FormData(form);

    startTransition(async () => {
      const result = await createListing(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        form.reset();
        onSuccess?.();
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
        }, 1500);
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
          "hover:border-blue-300 hover:text-blue-600 active:scale-[0.99] transition-all"
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
      className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Nový inzerát</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
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
            "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
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
          "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
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
          "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
        )}
      />

      {/* Price + Image URL */}
      <div className="grid grid-cols-2 gap-2">
        <input
          name="price"
          placeholder="Cena (volitelné)"
          className={cn(
            "rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-200",
            "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
          )}
        />
        <input
          name="imageUrl"
          type="url"
          placeholder="URL obrázku"
          className={cn(
            "rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-200",
            "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
          )}
        />
      </div>

      {/* Error / Success */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg px-3 py-2">
          Inzerát vytvořen!
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-xl py-2.5",
          "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold",
          "hover:bg-slate-800 dark:hover:bg-slate-200 active:scale-[0.99] transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <Send className="h-4 w-4" />
        {isPending ? "Vytvářím..." : "Přidat"}
      </button>
    </form>
  );
}
