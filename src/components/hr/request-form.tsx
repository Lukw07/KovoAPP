"use client";

// ============================================================================
// RequestForm — mobile-friendly HR request form with date range picker
// ============================================================================

import { useActionState, useState, useRef, useEffect } from "react";
import { createRequest, type CreateRequestState } from "@/actions/hr";
import { DayPicker } from "react-day-picker";
import { cs } from "date-fns/locale";
import { format } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

import "react-day-picker/style.css";

// ---------------------------------------------------------------------------
// Type options
// ---------------------------------------------------------------------------

const REQUEST_TYPES = [
  { value: "VACATION", label: "Dovolená", emoji: "🏖️" },
  { value: "SICK_DAY", label: "Sick day", emoji: "🤒" },
  { value: "DOCTOR", label: "Návštěva lékaře", emoji: "🩺" },
  { value: "PERSONAL_DAY", label: "Osobní volno", emoji: "🧘" },
  { value: "HOME_OFFICE", label: "Home office", emoji: "🏠" },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RequestForm({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState<
    CreateRequestState | undefined,
    FormData
  >(createRequest, undefined);

  const [selectedType, setSelectedType] = useState("VACATION");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [showCalendar, setShowCalendar] = useState(false);
  const [isHalfDayStart, setIsHalfDayStart] = useState(false);
  const [isHalfDayEnd, setIsHalfDayEnd] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Close on success
  useEffect(() => {
    if (state?.success) {
      // Reset form
      setDateRange({});
      setSelectedType("VACATION");
      setIsHalfDayStart(false);
      setIsHalfDayEnd(false);
      formRef.current?.reset();

      // Delay to let success message show
      const t = setTimeout(() => onSuccess?.(), 1200);
      return () => clearTimeout(t);
    }
  }, [state?.success, onSuccess]);

  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range) {
      setDateRange({ from: range.from, to: range.to ?? range.from });
    }
  };

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      {/* Success message */}
      {state?.success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <Check className="h-4 w-4" />
          Žádost byla úspěšně odeslána!
        </div>
      )}

      {/* Error message */}
      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-400">
          <X className="h-4 w-4" />
          {state.error}
        </div>
      )}

      {/* Type selector — pill chips */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Typ žádosti
        </label>
        <div className="flex flex-wrap gap-2">
          {REQUEST_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setSelectedType(t.value)}
              className={cn(
                "rounded-xl px-3.5 py-2 text-sm font-medium transition-all active:scale-95",
                selectedType === t.value
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
              )}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="type" value={selectedType} />
      </div>

      {/* Date range */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Období
        </label>
        <button
          type="button"
          onClick={() => setShowCalendar((v) => !v)}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border bg-white dark:bg-slate-800 px-4 py-3 text-left text-sm transition-colors active:scale-[0.99]",
            dateRange.from
              ? "border-blue-300 text-slate-800 dark:text-slate-200"
              : "border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500",
          )}
        >
          <CalendarDays className="h-5 w-5 text-slate-400 dark:text-slate-500" />
          {dateRange.from ? (
            <span>
              {format(dateRange.from, "d. M. yyyy")}
              {dateRange.to && dateRange.to !== dateRange.from
                ? ` — ${format(dateRange.to, "d. M. yyyy")}`
                : ""}
            </span>
          ) : (
            <span>Vyberte datum</span>
          )}
        </button>

        {showCalendar && (
          <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-lg">
            <DayPicker
              mode="range"
              locale={cs}
              selected={
                dateRange.from
                  ? { from: dateRange.from, to: dateRange.to ?? dateRange.from }
                  : undefined
              }
              onSelect={handleSelect}
              disabled={{ before: new Date() }}
              classNames={{
                root: "w-full",
                month_caption:
                  "text-sm font-semibold text-slate-900 dark:text-slate-100 capitalize",
                nav: "flex gap-1",
                button_previous:
                  "h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 text-slate-600 dark:text-slate-400",
                button_next:
                  "h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 text-slate-600 dark:text-slate-400",
                weekdays: "text-xs font-medium text-slate-400 dark:text-slate-500 uppercase",
                day: "h-9 w-9 text-sm rounded-lg transition-colors dark:text-slate-300",
                today: "!bg-slate-900 dark:!bg-slate-100 !text-white dark:!text-slate-900 !rounded-lg !font-bold",
                selected: "!bg-blue-600 !text-white",
                range_start: "!bg-blue-600 !text-white !rounded-l-lg",
                range_end: "!bg-blue-600 !text-white !rounded-r-lg",
                range_middle: "!bg-blue-100 !text-blue-800",
                outside: "text-slate-300 dark:text-slate-600",
              }}
              components={{
                Chevron: ({ orientation }) =>
                  orientation === "left" ? (
                    <ChevronLeft className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  ),
              }}
            />
            <button
              type="button"
              onClick={() => setShowCalendar(false)}
              className="mt-2 w-full rounded-lg bg-slate-100 dark:bg-slate-700 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 active:scale-[0.98]"
            >
              Potvrdit
            </button>
          </div>
        )}

        {dateRange.from && (
          <input
            type="hidden"
            name="startDate"
            value={dateRange.from.toISOString()}
          />
        )}
        {dateRange.to && (
          <input
            type="hidden"
            name="endDate"
            value={dateRange.to.toISOString()}
          />
        )}

        {/* Field error */}
        {state?.fieldErrors?.endDate && (
          <p className="mt-1 text-xs text-red-500">
            {state.fieldErrors.endDate[0]}
          </p>
        )}
      </div>

      {/* Half-day toggles */}
      {dateRange.from && (
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={isHalfDayStart}
              onChange={(e) => setIsHalfDayStart(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            Půlden na začátku
          </label>
          {dateRange.to &&
            dateRange.to.getTime() !== dateRange.from?.getTime() && (
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={isHalfDayEnd}
                  onChange={(e) => setIsHalfDayEnd(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                Půlden na konci
              </label>
            )}
        </div>
      )}
      <input
        type="hidden"
        name="isHalfDayStart"
        value={isHalfDayStart.toString()}
      />
      <input
        type="hidden"
        name="isHalfDayEnd"
        value={isHalfDayEnd.toString()}
      />

      {/* Reason */}
      <div>
        <label
          htmlFor="reason"
          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Poznámka{" "}
          <span className="font-normal text-slate-400 dark:text-slate-500">(nepovinná)</span>
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={3}
          maxLength={1000}
          placeholder="Důvod žádosti..."
          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 resize-none"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending || !dateRange.from}
        className={cn(
          "w-full rounded-xl py-3.5 text-sm font-semibold shadow-sm transition-all active:scale-[0.98]",
          isPending || !dateRange.from
            ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            : "bg-blue-600 text-white shadow-blue-600/25 hover:bg-blue-700",
        )}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Odesílám…
          </span>
        ) : (
          "Odeslat žádost"
        )}
      </button>
    </form>
  );
}
