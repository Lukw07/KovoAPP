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
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="resourceId" value={resourceId} />

      {/* Success */}
      {state?.success && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 px-4 py-2.5 text-sm font-medium text-amber-700 dark:text-amber-400">
          <Check className="h-4 w-4" />
          Rezervace odeslána ke schválení!
        </div>
      )}

      {/* Error */}
      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/30 px-4 py-2.5 text-sm font-medium text-red-700 dark:text-red-400">
          <X className="h-4 w-4" />
          {state.error}
        </div>
      )}

      {/* Date row — stacked on mobile, side by side on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="startTime"
            className="mb-1 block text-xs font-medium text-foreground-secondary"
          >
            Od
          </label>
          <input
            type="datetime-local"
            id="startTime"
            name="startTime"
            min={minDateTime}
            required
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          {state?.fieldErrors?.startTime && (
            <p className="mt-1 text-xs text-red-500">
              {state.fieldErrors.startTime[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="endTime"
            className="mb-1 block text-xs font-medium text-foreground-secondary"
          >
            Do
          </label>
          <input
            type="datetime-local"
            id="endTime"
            name="endTime"
            min={minDateTime}
            required
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          {state?.fieldErrors?.endTime && (
            <p className="mt-1 text-xs text-red-500">
              {state.fieldErrors.endTime[0]}
            </p>
          )}
        </div>
      </div>

      {/* Purpose */}
      <div>
        <label
          htmlFor="purpose"
          className="mb-1 block text-xs font-medium text-foreground-secondary"
        >
          Účel{" "}
          <span className="font-normal text-foreground-muted">(nepovinný)</span>
        </label>
        <input
          type="text"
          id="purpose"
          name="purpose"
          maxLength={500}
          placeholder="Např. služební cesta do Brna"
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder-foreground-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className={cn(
          "w-full rounded-xl py-3 text-sm font-semibold shadow-sm transition-all active:scale-[0.98]",
          isPending
            ? "bg-border text-foreground-muted cursor-not-allowed"
            : "bg-accent text-white shadow-accent glow-blue hover:bg-accent-hover",
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
