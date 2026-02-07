"use client";

// ============================================================================
// BookingForm — quick booking form for a selected resource
// ============================================================================

import { useActionState, useEffect, useRef } from "react";
import { bookResource, type BookResourceState } from "@/actions/reservations";
import { format } from "date-fns";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingFormProps {
  resourceId: string;
  resourceName: string;
  onSuccess?: () => void;
}

export default function BookingForm({
  resourceId,
  resourceName,
  onSuccess,
}: BookingFormProps) {
  const [state, formAction, isPending] = useActionState<
    BookResourceState | undefined,
    FormData
  >(bookResource, undefined);

  const formRef = useRef<HTMLFormElement>(null);

  // Today formatted for datetime-local min value
  const now = new Date();
  const minDateTime = format(now, "yyyy-MM-dd'T'HH:00");

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      const t = setTimeout(() => onSuccess?.(), 1200);
      return () => clearTimeout(t);
    }
  }, [state?.success, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="resourceId" value={resourceId} />

      {/* Success */}
      {state?.success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <Check className="h-4 w-4" />
          Rezervace potvrzena!
        </div>
      )}

      {/* Error */}
      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-400">
          <X className="h-4 w-4" />
          {state.error}
        </div>
      )}

      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Rezervovat: <span className="font-semibold">{resourceName}</span>
      </p>

      {/* Start time */}
      <div>
        <label
          htmlFor="startTime"
          className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Od
        </label>
        <input
          type="datetime-local"
          id="startTime"
          name="startTime"
          min={minDateTime}
          required
          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
        />
        {state?.fieldErrors?.startTime && (
          <p className="mt-1 text-xs text-red-500">
            {state.fieldErrors.startTime[0]}
          </p>
        )}
      </div>

      {/* End time */}
      <div>
        <label
          htmlFor="endTime"
          className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Do
        </label>
        <input
          type="datetime-local"
          id="endTime"
          name="endTime"
          min={minDateTime}
          required
          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
        />
        {state?.fieldErrors?.endTime && (
          <p className="mt-1 text-xs text-red-500">
            {state.fieldErrors.endTime[0]}
          </p>
        )}
      </div>

      {/* Purpose */}
      <div>
        <label
          htmlFor="purpose"
          className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Účel{" "}
          <span className="font-normal text-slate-400 dark:text-slate-500">(nepovinný)</span>
        </label>
        <input
          type="text"
          id="purpose"
          name="purpose"
          maxLength={500}
          placeholder="Např. služební cesta do Brna"
          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className={cn(
          "w-full rounded-xl py-3.5 text-sm font-semibold shadow-sm transition-all active:scale-[0.98]",
          isPending
            ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            : "bg-blue-600 text-white shadow-blue-600/25 hover:bg-blue-700",
        )}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Rezervuji…
          </span>
        ) : (
          "Rezervovat"
        )}
      </button>
    </form>
  );
}
