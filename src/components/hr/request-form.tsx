"use client";

// ============================================================================
// RequestForm — mobile-friendly HR request form with multi–date-range support,
// hours-based tracking, over-limit warnings, and informational disclaimer
// ============================================================================

import { useActionState, useState, useRef, useEffect } from "react";
import { createRequest, type CreateRequestState } from "@/actions/hr";
import { DayPicker } from "react-day-picker";
import { cs } from "date-fns/locale";
import { eachDayOfInterval, format, isWeekend } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  X,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { getMyVacationInfo } from "@/actions/hr-queries";

import "react-day-picker/style.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VacationInfo = Awaited<ReturnType<typeof getMyVacationInfo>>;

interface DateRangeEntry {
  id: number;
  from?: Date;
  to?: Date;
  isHalfDayStart: boolean;
  isHalfDayEnd: boolean;
}

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

const FUND_TYPE_LABELS: Record<string, string> = {
  FULL_8H: "8h/den",
  STANDARD_7_5H: "7,5h/den",
  PART_TIME_6H: "6h/den",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcWorkingDays(
  start: Date,
  end: Date,
  halfStart: boolean,
  halfEnd: boolean,
): number {
  const days = eachDayOfInterval({ start, end }).filter(
    (d) => !isWeekend(d),
  ).length;
  let total = days;
  if (halfStart && days > 0) total -= 0.5;
  if (halfEnd && days > 0) total -= 0.5;
  return Math.max(total, 0.5);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RequestForm({
  vacationInfo,
  onSuccess,
}: {
  vacationInfo?: VacationInfo;
  onSuccess?: () => void;
}) {
  const [, , isPending] = useActionState<
    CreateRequestState | undefined,
    FormData
  >(createRequest, undefined);

  const [selectedType, setSelectedType] = useState("VACATION");
  const [dateRanges, setDateRanges] = useState<DateRangeEntry[]>([
    { id: 1, isHalfDayStart: false, isHalfDayEnd: false },
  ]);
  const [activeRangeId, setActiveRangeId] = useState(1);
  const [showCalendar, setShowCalendar] = useState(false);
  const [submittingIndex, setSubmittingIndex] = useState(-1);
  const [results, setResults] = useState<
    { idx: number; success: boolean; warning?: string; error?: string }[]
  >([]);
  const formRef = useRef<HTMLFormElement>(null);
  const nextId = useRef(2);

  const hoursPerDay = vacationInfo?.hoursPerDay ?? 8;
  const entitlement = vacationInfo?.entitlement;

  // Close on success (all submitted)
  useEffect(() => {
    if (
      results.length > 0 &&
      results.length === dateRanges.filter((r) => r.from).length &&
      results.every((r) => r.success)
    ) {
      const t = setTimeout(() => onSuccess?.(), 1500);
      return () => clearTimeout(t);
    }
  }, [results, dateRanges, onSuccess]);

  // Calculate totals
  const totalDaysAll = dateRanges.reduce((sum, r) => {
    if (!r.from) return sum;
    return (
      sum +
      calcWorkingDays(
        r.from,
        r.to ?? r.from,
        r.isHalfDayStart,
        r.isHalfDayEnd,
      )
    );
  }, 0);
  const totalHoursAll = totalDaysAll * hoursPerDay;

  const isOverLimit =
    entitlement != null && totalHoursAll > entitlement.remainingHours;

  const addRange = () => {
    const id = nextId.current++;
    setDateRanges((prev) => [
      ...prev,
      { id, isHalfDayStart: false, isHalfDayEnd: false },
    ]);
    setActiveRangeId(id);
    setShowCalendar(true);
  };

  const removeRange = (id: number) => {
    setDateRanges((prev) => prev.filter((r) => r.id !== id));
    if (activeRangeId === id) {
      setActiveRangeId(dateRanges[0]?.id ?? 0);
    }
  };

  const updateRange = (id: number, patch: Partial<DateRangeEntry>) => {
    setDateRanges((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  const activeRange = dateRanges.find((r) => r.id === activeRangeId);

  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range && activeRangeId) {
      updateRange(activeRangeId, {
        from: range.from,
        to: range.to ?? range.from,
      });
    }
  };

  // Submit all date ranges sequentially
  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRanges = dateRanges.filter((r) => r.from);
    if (validRanges.length === 0) return;

    setResults([]);
    const reason =
      formRef.current?.querySelector<HTMLTextAreaElement>("[name=reason]")
        ?.value ?? "";

    for (let i = 0; i < validRanges.length; i++) {
      const r = validRanges[i];
      setSubmittingIndex(i);

      const fd = new FormData();
      fd.set("type", selectedType);
      fd.set("startDate", r.from!.toISOString());
      fd.set("endDate", (r.to ?? r.from!).toISOString());
      fd.set("reason", reason);
      fd.set("isHalfDayStart", r.isHalfDayStart.toString());
      fd.set("isHalfDayEnd", r.isHalfDayEnd.toString());

      const result = await createRequest(undefined, fd);
      setResults((prev) => [
        ...prev,
        {
          idx: i,
          success: !!result?.success,
          warning: result?.warning,
          error: result?.error,
        },
      ]);

      if (result?.error) break;
    }
    setSubmittingIndex(-1);
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmitAll}
      className="space-y-5"
    >
      {/* ── Informational disclaimer ─────────────────────────────────── */}
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
        <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          <strong>Informativní systém</strong> — Tento systém slouží pouze pro
          orientační přehled. Závazné údaje o čerpání dovolené a pracovní době
          naleznete na své výplatní pásce.
        </p>
      </div>

      {/* Success / warning / error messages */}
      {results.length > 0 && results.every((r) => r.success) && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <Check className="h-4 w-4" />
          {results.length === 1
            ? "Žádost byla úspěšně odeslána!"
            : `${results.length} žádostí bylo úspěšně odesláno!`}
        </div>
      )}

      {results.some((r) => r.warning) && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            {results
              .filter((r) => r.warning)
              .map((r, i) => (
                <p key={i}>{r.warning}</p>
              ))}
          </div>
        </div>
      )}

      {results.some((r) => r.error) && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-400">
          <X className="h-4 w-4" />
          {results.find((r) => r.error)?.error}
        </div>
      )}

      {/* ── Type selector — pill chips ──────────────────────────────── */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
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
                  ? "bg-accent text-white shadow-accent glow-blue"
                  : "bg-background-secondary text-foreground-secondary hover:bg-border",
              )}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Vacation balance info ───────────────────────────────────── */}
      {entitlement &&
        (selectedType === "VACATION" || selectedType === "PERSONAL_DAY") && (
          <div className="rounded-xl border border-border bg-background-secondary p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-secondary">
                Zbývající hodiny ({FUND_TYPE_LABELS[vacationInfo?.workFundType ?? "FULL_8H"]})
              </span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  isOverLimit
                    ? "text-red-600 dark:text-red-400"
                    : "text-foreground",
                )}
              >
                {entitlement.remainingHours}h /{" "}
                {entitlement.totalHours + entitlement.carriedOverHours}h
              </span>
            </div>
            <div className="h-2 rounded-full bg-background-tertiary overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{
                  width: `${Math.min(100, (entitlement.usedHours / (entitlement.totalHours + entitlement.carriedOverHours)) * 100)}%`,
                }}
              />
            </div>
            {totalHoursAll > 0 && (
              <p
                className={cn(
                  "text-xs",
                  isOverLimit
                    ? "text-red-600 dark:text-red-400 font-medium"
                    : "text-foreground-muted",
                )}
              >
                {isOverLimit ? "⚠️ " : ""}
                Požadujete: {totalHoursAll}h ({totalDaysAll}{" "}
                {totalDaysAll === 1
                  ? "den"
                  : totalDaysAll < 5
                    ? "dny"
                    : "dní"}
                )
                {isOverLimit &&
                  ` — překračujete limit o ${(totalHoursAll - entitlement.remainingHours).toFixed(1)}h`}
              </p>
            )}
          </div>
        )}

      {/* ── Date ranges ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-foreground">
            Období
          </label>
          <button
            type="button"
            onClick={addRange}
            className="flex items-center gap-1 rounded-lg bg-background-secondary px-2.5 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-border transition-colors active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Přidat období
          </button>
        </div>

        <div className="space-y-2">
          {dateRanges.map((range) => {
            const days = range.from
              ? calcWorkingDays(
                  range.from,
                  range.to ?? range.from,
                  range.isHalfDayStart,
                  range.isHalfDayEnd,
                )
              : 0;
            const hours = days * hoursPerDay;

            return (
              <div key={range.id} className="space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRangeId(range.id);
                      setShowCalendar(true);
                    }}
                    className={cn(
                      "flex flex-1 items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left text-sm transition-colors active:scale-[0.99]",
                      activeRangeId === range.id && showCalendar
                        ? "border-accent ring-2 ring-accent/20"
                        : range.from
                          ? "border-accent/50 text-foreground"
                          : "border-border text-foreground-muted",
                    )}
                  >
                    <CalendarDays className="h-5 w-5 text-foreground-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      {range.from ? (
                        <span>
                          {format(range.from, "d. M. yyyy")}
                          {range.to &&
                            range.to.getTime() !== range.from.getTime() &&
                            ` — ${format(range.to, "d. M. yyyy")}`}
                        </span>
                      ) : (
                        <span>Vyberte datum</span>
                      )}
                      {range.from && (
                        <span className="ml-2 text-xs text-foreground-muted">
                          ({days}d · {hours}h)
                        </span>
                      )}
                    </div>
                  </button>
                  {dateRanges.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRange(range.id)}
                      className="flex h-[50px] w-10 items-center justify-center rounded-xl border border-border text-foreground-muted hover:text-red-500 hover:border-red-300 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Half-day toggles for this range */}
                {range.from && (
                  <div className="flex gap-4 ml-1">
                    <label className="flex items-center gap-2 text-sm text-foreground-secondary">
                      <input
                        type="checkbox"
                        checked={range.isHalfDayStart}
                        onChange={(e) =>
                          updateRange(range.id, {
                            isHalfDayStart: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                      />
                      Půlden na začátku
                    </label>
                    {range.to &&
                      range.to.getTime() !== range.from.getTime() && (
                        <label className="flex items-center gap-2 text-sm text-foreground-secondary">
                          <input
                            type="checkbox"
                            checked={range.isHalfDayEnd}
                            onChange={(e) =>
                              updateRange(range.id, {
                                isHalfDayEnd: e.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                          />
                          Půlden na konci
                        </label>
                      )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Calendar for active range */}
        {showCalendar && activeRange && (
          <div className="mt-2 rounded-xl border border-border bg-card p-3 shadow-lg">
            <DayPicker
              mode="range"
              locale={cs}
              selected={
                activeRange.from
                  ? {
                      from: activeRange.from,
                      to: activeRange.to ?? activeRange.from,
                    }
                  : undefined
              }
              onSelect={handleSelect}
              disabled={{ before: new Date() }}
              classNames={{
                root: "w-full",
                months: "w-full",
                month: "w-full",
                month_grid: "w-full border-collapse",
                month_caption:
                  "text-sm font-semibold text-foreground capitalize",
                nav: "flex gap-1",
                button_previous:
                  "h-8 w-8 rounded-lg flex items-center justify-center hover:bg-background-secondary active:scale-95 text-foreground-secondary",
                button_next:
                  "h-8 w-8 rounded-lg flex items-center justify-center hover:bg-background-secondary active:scale-95 text-foreground-secondary",
                weekdays:
                  "text-xs font-medium text-foreground-muted uppercase",
                weekday: "text-center py-1",
                week: "w-full",
                day: "h-9 w-full text-sm rounded-lg transition-colors text-foreground text-center p-1",
                day_button:
                  "w-full h-full rounded-lg flex items-center justify-center",
                today: "!bg-blue-600 !text-white !rounded-lg !font-bold",
                selected: "!bg-blue-600 !text-white",
                range_start: "!bg-blue-600 !text-white !rounded-l-lg",
                range_end: "!bg-blue-600 !text-white !rounded-r-lg",
                range_middle:
                  "!bg-blue-100 dark:!bg-blue-900/30 !text-blue-800 dark:!text-blue-300",
                outside: "text-foreground-muted/40",
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
              className="mt-2 w-full rounded-lg bg-background-secondary py-2 text-sm font-medium text-foreground-secondary active:scale-[0.98]"
            >
              Potvrdit
            </button>
          </div>
        )}
      </div>

      {/* ── Reason ──────────────────────────────────────────────────── */}
      <div>
        <label
          htmlFor="reason"
          className="mb-2 block text-sm font-medium text-foreground"
        >
          Poznámka{" "}
          <span className="font-normal text-foreground-muted">(nepovinná)</span>
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={3}
          maxLength={1000}
          placeholder="Důvod žádosti..."
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder-foreground-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
        />
      </div>

      {/* ── Over-limit warning ──────────────────────────────────────── */}
      {isOverLimit && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
            <p className="font-semibold">Přečerpání dovolené</p>
            <p>
              Tato žádost překračuje váš dostupný limit hodin. Žádost bude
              odeslána, ale bude označena jako přečerpání a manažer i vy
              budete upozorněni.
            </p>
          </div>
        </div>
      )}

      {/* ── Summary ─────────────────────────────────────────────────── */}
      {totalHoursAll > 0 && dateRanges.length > 1 && (
        <div className="rounded-xl bg-background-secondary p-3 text-sm text-foreground-secondary">
          Celkem: <strong>{totalDaysAll}</strong>{" "}
          {totalDaysAll === 1 ? "den" : totalDaysAll < 5 ? "dny" : "dní"} ={" "}
          <strong>{totalHoursAll}h</strong>
          {dateRanges.filter((r) => r.from).length > 1 &&
            ` (${dateRanges.filter((r) => r.from).length} žádostí)`}
        </div>
      )}

      {/* ── Submit ──────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={
          isPending ||
          submittingIndex >= 0 ||
          !dateRanges.some((r) => r.from)
        }
        className={cn(
          "w-full rounded-xl py-3.5 text-sm font-semibold shadow-sm transition-all active:scale-[0.98]",
          isPending ||
            submittingIndex >= 0 ||
            !dateRanges.some((r) => r.from)
            ? "bg-background-secondary text-foreground-muted cursor-not-allowed"
            : "bg-accent text-white shadow-accent glow-blue hover:bg-accent-hover",
        )}
      >
        {submittingIndex >= 0 ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Odesílám {submittingIndex + 1}/{dateRanges.filter((r) => r.from).length}…
          </span>
        ) : dateRanges.filter((r) => r.from).length > 1 ? (
          `Odeslat ${dateRanges.filter((r) => r.from).length} žádostí`
        ) : (
          "Odeslat žádost"
        )}
      </button>
    </form>
  );
}
