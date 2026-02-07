"use client";

// ============================================================================
// VacationCalendar — visual calendar showing approved vacations & holidays
// ============================================================================

import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { cs } from "date-fns/locale";
import { getCzechHolidays } from "@/lib/holidays";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

import "react-day-picker/style.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VacationRange = {
  id: string;
  type: string;
  startDate: Date | string;
  endDate: Date | string;
  totalDays: number;
};

interface VacationCalendarProps {
  vacations: VacationRange[];
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<string, { bg: string; dot: string; label: string }> = {
  VACATION: {
    bg: "bg-blue-100 text-blue-800",
    dot: "bg-blue-500",
    label: "Dovolená",
  },
  PERSONAL_DAY: {
    bg: "bg-violet-100 text-violet-800",
    dot: "bg-violet-500",
    label: "Osobní volno",
  },
  HOME_OFFICE: {
    bg: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-500",
    label: "Home Office",
  },
  SICK_DAY: {
    bg: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
    label: "Sick day",
  },
  DOCTOR: {
    bg: "bg-rose-100 text-rose-800",
    dot: "bg-rose-500",
    label: "Lékař",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VacationCalendar({
  vacations,
  className,
}: VacationCalendarProps) {
  const [month, setMonth] = useState(new Date());
  const year = month.getFullYear();

  // Holidays for the displayed year
  const holidays = useMemo(() => getCzechHolidays(year), [year]);

  // Build modifier arrays for DayPicker
  const vacationDays = useMemo(() => {
    return vacations.map((v) => ({
      from: new Date(v.startDate),
      to: new Date(v.endDate),
    }));
  }, [vacations]);

  // Build a map of date → type for the day cell renderer
  const dayTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of vacations) {
      const start = new Date(v.startDate);
      const end = new Date(v.endDate);
      const d = new Date(start);
      while (d <= end) {
        map.set(d.toDateString(), v.type);
        d.setDate(d.getDate() + 1);
      }
    }
    return map;
  }, [vacations]);

  // Unique types used in legend
  const usedTypes = useMemo(() => {
    const set = new Set(vacations.map((v) => v.type));
    return Array.from(set);
  }, [vacations]);

  return (
    <div className={cn("rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4", className)}>
      <DayPicker
        mode="multiple"
        locale={cs}
        month={month}
        onMonthChange={setMonth}
        modifiers={{
          vacation: vacationDays,
          holiday: holidays,
        }}
        modifiersClassNames={{
          vacation: "!bg-blue-100 !text-blue-700 !font-semibold !rounded-lg",
          holiday: "!bg-red-50 !text-red-600 !font-semibold !rounded-lg",
        }}
        classNames={{
          root: "w-full",
          month_caption: "text-base font-semibold text-slate-900 dark:text-slate-100 capitalize",
          nav: "flex gap-1",
          button_previous:
            "h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 text-slate-600 dark:text-slate-400",
          button_next:
            "h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 text-slate-600 dark:text-slate-400",
          weekdays: "text-xs font-medium text-slate-400 dark:text-slate-500 uppercase",
          day: "h-9 w-9 text-sm rounded-lg transition-colors",
          today: "!bg-slate-900 !text-white !rounded-lg !font-bold",
          selected: "!bg-blue-600 !text-white",
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
        disabled={false}
      />

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 dark:border-slate-700 pt-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          Svátky
        </div>
        {usedTypes.map((t) => {
          const cfg = TYPE_COLORS[t];
          return cfg ? (
            <div
              key={t}
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
            >
              <span className={cn("h-2.5 w-2.5 rounded-full", cfg.dot)} />
              {cfg.label}
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
}
