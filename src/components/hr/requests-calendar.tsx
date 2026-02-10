"use client";

// ============================================================================
// RequestsCalendar — calendar view of HR requests with month navigation
// ============================================================================

import { useState, useTransition, useMemo } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { getRequestsForCalendar } from "@/actions/hr-queries";
import { getCzechHolidays } from "@/lib/holidays";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CalendarRequest = {
  id: string;
  type: string;
  status: string;
  startDate: Date | string;
  endDate: Date | string;
  totalDays: number;
  reason: string | null;
  isHalfDayStart: boolean;
  isHalfDayEnd: boolean;
};

interface RequestsCalendarProps {
  initialRequests: CalendarRequest[];
  initialYear: number;
  initialMonth: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

const DAY_NAMES = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

const TYPE_CONFIG: Record<
  string,
  { color: string; bg: string; label: string; emoji: string }
> = {
  VACATION: {
    color: "bg-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800",
    label: "Dovolená",
    emoji: "🏖️",
  },
  SICK_DAY: {
    color: "bg-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800",
    label: "Sick day",
    emoji: "🤒",
  },
  DOCTOR: {
    color: "bg-rose-500",
    bg: "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800",
    label: "Lékař",
    emoji: "🩺",
  },
  PERSONAL_DAY: {
    color: "bg-violet-500",
    bg: "bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800",
    label: "Osobní volno",
    emoji: "🧘",
  },
  HOME_OFFICE: {
    color: "bg-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800",
    label: "Home office",
    emoji: "🏠",
  },
};

const STATUS_LABELS: Record<string, { label: string; style: string }> = {
  PENDING: {
    label: "Čeká",
    style: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
  APPROVED: {
    label: "Schváleno",
    style: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
  REJECTED: {
    label: "Zamítnuto",
    style: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

// ---------------------------------------------------------------------------
// Day Detail Panel
// ---------------------------------------------------------------------------

function DayDetail({
  date,
  requests,
  holidays,
  onClose,
}: {
  date: Date;
  requests: CalendarRequest[];
  holidays: Date[];
  onClose: () => void;
}) {
  const dateStripped = stripTime(date);
  const dayHoliday = holidays.some((h) => isSameDay(h, date));
  const dayRequests = requests.filter((r) => {
    const start = stripTime(new Date(r.startDate));
    const end = stripTime(new Date(r.endDate));
    return dateStripped >= start && dateStripped <= end;
  });

  const dayStr = format(date, "EEEE d. MMMM", { locale: cs });

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground capitalize">{dayStr}</h3>
        <button
          onClick={onClose}
          className="text-foreground-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {dayHoliday && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3 border border-red-200 dark:border-red-800 text-sm font-medium text-red-700 dark:text-red-400">
          🇨🇿 Státní svátek
        </div>
      )}

      {dayRequests.length === 0 && !dayHoliday && (
        <p className="text-xs text-foreground-muted text-center py-4">
          Žádné žádosti v tento den
        </p>
      )}

      {dayRequests.map((req) => {
        const type = TYPE_CONFIG[req.type] ?? TYPE_CONFIG.VACATION;
        const status = STATUS_LABELS[req.status] ?? STATUS_LABELS.PENDING;
        const isSingleDay =
          new Date(req.startDate).toDateString() ===
          new Date(req.endDate).toDateString();

        return (
          <div
            key={req.id}
            className={cn(
              "rounded-xl p-3 border",
              type.bg,
              req.status === "REJECTED" && "opacity-60",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">
                {type.emoji} {type.label}
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold rounded-md px-1.5 py-0.5",
                  status.style,
                )}
              >
                {status.label}
              </span>
            </div>
            <p className="text-xs text-foreground-secondary mt-1">
              {format(new Date(req.startDate), "d. MMM", { locale: cs })}
              {!isSingleDay &&
                ` — ${format(new Date(req.endDate), "d. MMM", { locale: cs })}`}
              <span className="ml-1.5 text-foreground-muted">
                ({req.totalDays}{" "}
                {req.totalDays === 1
                  ? "den"
                  : req.totalDays < 5
                    ? "dny"
                    : "dní"})
              </span>
            </p>
            {req.reason && (
              <p className="text-xs text-foreground-muted mt-1 line-clamp-2">
                {req.reason}
              </p>
            )}
            {(req.isHalfDayStart || req.isHalfDayEnd) && (
              <p className="text-[10px] text-foreground-muted mt-1">
                {req.isHalfDayStart && "½ den na začátku"}
                {req.isHalfDayStart && req.isHalfDayEnd && " · "}
                {req.isHalfDayEnd && "½ den na konci"}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function RequestsCalendar({
  initialRequests,
  initialYear,
  initialMonth,
}: RequestsCalendarProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [requests, setRequests] = useState<CalendarRequest[]>(initialRequests);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();

  const today = new Date();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const holidays = useMemo(() => getCzechHolidays(year), [year]);

  // Unique types used in current view (for legend)
  const usedTypes = useMemo(() => {
    const set = new Set(requests.map((r) => r.type));
    return Array.from(set);
  }, [requests]);

  const navigateMonth = (dir: number) => {
    let newMonth = month + dir;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    setMonth(newMonth);
    setYear(newYear);
    setSelectedDate(null);

    startTransition(async () => {
      const data = await getRequestsForCalendar(newYear, newMonth);
      setRequests(data as CalendarRequest[]);
    });
  };

  // Build calendar grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // Helper: get info for a specific day
  const getDayInfo = (day: number) => {
    const date = new Date(year, month - 1, day);
    const dateStripped = stripTime(date);
    const hasHoliday = holidays.some((h) => isSameDay(h, date));
    const dayRequests = requests.filter((r) => {
      const start = stripTime(new Date(r.startDate));
      const end = stripTime(new Date(r.endDate));
      return dateStripped >= start && dateStripped <= end;
    });
    const isToday = isSameDay(date, today);
    const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    return { hasHoliday, dayRequests, isToday, isSelected, isWeekend };
  };

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between rounded-2xl bg-card border border-border p-3">
        <button
          onClick={() => navigateMonth(-1)}
          disabled={isPending}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-background-secondary text-foreground-secondary hover:text-foreground hover:bg-background-tertiary transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="text-sm font-bold text-foreground">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <button
          onClick={() => navigateMonth(1)}
          disabled={isPending}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-background-secondary text-foreground-secondary hover:text-foreground hover:bg-background-tertiary transition-colors disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              className="min-w-0 py-2 text-center text-[11px] font-semibold text-foreground-muted"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="min-w-0 h-12 border-b border-r border-border/50"
                />
              );
            }

            const { hasHoliday, dayRequests, isToday, isSelected, isWeekend } =
              getDayInfo(day);

            return (
              <button
                key={day}
                onClick={() =>
                  setSelectedDate(new Date(year, month - 1, day))
                }
                className={cn(
                  "relative min-w-0 h-12 flex flex-col items-center justify-center border-b border-r border-border/50 transition-colors",
                  "hover:bg-background-secondary",
                  isSelected && "bg-accent/10 ring-1 ring-accent ring-inset",
                  isToday && !isSelected && "bg-blue-50 dark:bg-blue-900/20",
                  isWeekend &&
                    !isSelected &&
                    !isToday &&
                    "bg-slate-50 dark:bg-slate-800/30",
                  hasHoliday && "text-red-600 dark:text-red-400",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday && "bg-accent text-white",
                    hasHoliday && !isToday && "font-bold",
                  )}
                >
                  {day}
                </span>

                {/* Dots for requests */}
                {(dayRequests.length > 0 || hasHoliday) && (
                  <div className="absolute bottom-0.5 flex gap-0.5">
                    {hasHoliday && (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    )}
                    {dayRequests.slice(0, 3).map((r) => {
                      const cfg = TYPE_CONFIG[r.type];
                      return (
                        <span
                          key={r.id}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            cfg?.color ?? "bg-gray-400",
                            r.status === "PENDING" && "opacity-50",
                            r.status === "REJECTED" && "opacity-30",
                          )}
                        />
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <DayDetail
          date={selectedDate}
          requests={requests}
          holidays={holidays}
          onClose={() => setSelectedDate(null)}
        />
      )}

      {/* Legend */}
      <div className="rounded-2xl bg-card border border-border p-3">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5 text-xs text-foreground-secondary">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            Svátky
          </div>
          {usedTypes.map((t) => {
            const cfg = TYPE_CONFIG[t];
            return cfg ? (
              <div
                key={t}
                className="flex items-center gap-1.5 text-xs text-foreground-secondary"
              >
                <span className={cn("h-2.5 w-2.5 rounded-full", cfg.color)} />
                {cfg.label}
              </div>
            ) : null;
          })}
          {usedTypes.length > 0 && (
            <>
              <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600 opacity-50" />
                Čeká na schválení
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
