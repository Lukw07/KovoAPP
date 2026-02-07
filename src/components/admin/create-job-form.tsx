"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { createJobPosting } from "@/actions/jobs";
import { cn } from "@/lib/utils";

interface CreateJobFormProps {
  onSuccess?: () => void;
}

export function CreateJobForm({ onSuccess }: CreateJobFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;

    startTransition(async () => {
      const result = await createJobPosting(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        form.reset();
        onSuccess?.();
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
    >
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Nový inzerát</h3>

      {/* Title */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Pozice *</label>
        <input
          name="title"
          required
          placeholder="Např. CNC operátor"
          className={cn(
            "w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-200",
            "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
          )}
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Popis práce *
        </label>
        <textarea
          name="description"
          required
          rows={4}
          placeholder="Popište náplň práce..."
          className={cn(
            "w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm resize-none dark:bg-slate-700 dark:text-slate-200",
            "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
          )}
        />
      </div>

      {/* Requirements */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Požadavky (volitelné)
        </label>
        <textarea
          name="requirements"
          rows={3}
          placeholder="Požadujeme: vzdělání, praxe, certifikáty..."
          className={cn(
            "w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm resize-none dark:bg-slate-700 dark:text-slate-200",
            "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
          )}
        />
      </div>

      {/* Location + Contract type */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Místo</label>
          <input
            name="location"
            placeholder="Brno, Česko"
            className={cn(
              "w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-200",
              "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
            )}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Typ smlouvy
          </label>
          <select
            name="contractType"
            className={cn(
              "w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200",
              "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
            )}
          >
            <option value="">-- Vyberte --</option>
            <option value="HPP">HPP</option>
            <option value="DPP">DPP</option>
            <option value="DPČ">DPČ</option>
            <option value="OSVČ">OSVČ</option>
            <option value="Brigáda">Brigáda</option>
          </select>
        </div>
      </div>

      {/* Salary + Referral bonus */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Platové rozmezí
          </label>
          <input
            name="salaryRange"
            placeholder="35 000 - 45 000 Kč"
            className={cn(
              "w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-200",
              "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
            )}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Bonus za doporučení (body)
          </label>
          <input
            name="referralBonus"
            type="number"
            min={0}
            defaultValue={0}
            className={cn(
              "w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-200",
              "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
            )}
          />
        </div>
      </div>

      {/* Closes at */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Uzávěrka přihlášek (volitelné)
        </label>
        <input
          name="closesAt"
          type="datetime-local"
          className={cn(
            "w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-200",
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
          Inzerát úspěšně publikován!
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-xl py-3",
          "bg-blue-600 text-white text-sm font-semibold shadow-sm",
          "hover:bg-blue-700 active:scale-[0.99] transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <Send className="h-4 w-4" />
        {isPending ? "Publikuji..." : "Publikovat inzerát"}
      </button>
    </form>
  );
}
