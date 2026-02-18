"use client";

// ============================================================================
// VacationCalendar — visual calendar showing approved vacations & holidays
// ============================================================================

import { useState } from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { cs } from "date-fns/locale";
import { getCzechHolidays } from "@/lib/holidays";
import { cn } from "@/lib/utils";

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
  totalHours?: number;
};

interface VacationCalendarProps {
  vacations: VacationRange[];
  className?: string;
}

type DateRange = { from: Date; to: Date };

function toLocalDateOnly(value: Date | string): Date {
  const parsed = value instanceof Date ? value : new Date(value);
  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
    12,
    0,
    0,
    0,
  );
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
  const holidays = getCzechHolidays(year);

  // Build modifier arrays for DayPicker
  const rangesByType = (() => {
    const ranges: Record<string, DateRange[]> = {
      VACATION: [],
      PERSONAL_DAY: [],
      HOME_OFFICE: [],
      SICK_DAY: [],
      DOCTOR: [],
    };

    for (const vacation of vacations) {
      if (!ranges[vacation.type]) continue;
      ranges[vacation.type].push({
        from: toLocalDateOnly(vacation.startDate),
        to: toLocalDateOnly(vacation.endDate),
      });
    }

    return ranges;
  })();

  // Unique types used in legend
  const usedTypes = Array.from(new Set(vacations.map((v) => v.type)));

  // Merge default rdp class names with Tailwind overrides (v9 requirement)
  const defaults = getDefaultClassNames();

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-3 sm:p-4 overflow-hidden", className)}>
      <DayPicker
        locale={cs}
        month={month}
        onMonthChange={setMonth}
        modifiers={{
          vacation: rangesByType.VACATION,
          personal_day: rangesByType.PERSONAL_DAY,
          home_office: rangesByType.HOME_OFFICE,
          sick_day: rangesByType.SICK_DAY,
          doctor: rangesByType.DOCTOR,
          holiday: holidays,
        }}
        modifiersClassNames={{
          vacation: "rdp-vacation",
          personal_day: "rdp-personal-day",
          home_office: "rdp-home-office",
          sick_day: "rdp-sick-day",
          doctor: "rdp-doctor",
          holiday: "rdp-holiday",
          today: "rdp-today-custom",
        }}
        classNames={{
          root: `${defaults.root} w-full`,
          months: `${defaults.months} w-full`,
          month: `${defaults.month} w-full`,
          month_grid: `${defaults.month_grid} w-full border-collapse`,
          month_caption: `${defaults.month_caption} text-sm sm:text-base font-semibold text-foreground capitalize`,
          nav: `${defaults.nav} flex gap-1`,
          button_previous: `${defaults.button_previous} hover:bg-background-secondary active:scale-95 text-foreground-secondary`,
          button_next: `${defaults.button_next} hover:bg-background-secondary active:scale-95 text-foreground-secondary`,
          weekdays: `${defaults.weekdays} text-[10px] sm:text-xs font-medium text-foreground-muted uppercase`,
          weekday: `${defaults.weekday} text-center py-1`,
          week: `${defaults.week} w-full`,
          day: `${defaults.day} text-xs sm:text-sm rounded-lg transition-colors text-foreground text-center`,
          day_button: `${defaults.day_button} rounded-lg`,
          today: `${defaults.today} bg-blue-600 text-white rounded-lg font-bold`,
          selected: `${defaults.selected} bg-blue-600 text-white`,
          outside: `${defaults.outside} text-foreground-muted/40`,
          chevron: `${defaults.chevron} fill-foreground-secondary`,
        }}
        disabled={false}
        hideNavigation={false}
      />

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3">
        <div className="flex items-center gap-1.5 text-xs text-foreground-secondary">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          Svátky
        </div>
        {usedTypes.map((t) => {
          const cfg = TYPE_COLORS[t];
          return cfg ? (
            <div
              key={t}
              className="flex items-center gap-1.5 text-xs text-foreground-secondary"
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
