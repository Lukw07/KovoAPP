"use client";

// ============================================================================
// BookingTimeline — horizontal timeline showing resource availability
// ============================================================================

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, addHours, startOfDay } from "date-fns";
import { cs } from "date-fns/locale";
import { Clock } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TimelineReservation = {
  id: string;
  startTime: Date | string;
  endTime: Date | string;
  status: string;
  user: { id: string; name: string; avatarUrl: string | null };
};

interface BookingTimelineProps {
  /** Reservations for the resource on this day */
  reservations: TimelineReservation[];
  /** The date to display (start of day) */
  date: Date;
  /** Resource name for header */
  resourceName: string;
  /** Working hours range (default 6–20) */
  startHour?: number;
  endHour?: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSlotStatus(
  hour: number,
  reservations: TimelineReservation[],
  date: Date,
): {
  occupied: boolean;
  reservation?: TimelineReservation;
} {
  const slotStart = addHours(startOfDay(date), hour);
  const slotEnd = addHours(slotStart, 1);

  for (const r of reservations) {
    const rStart = new Date(r.startTime);
    const rEnd = new Date(r.endTime);
    // overlap: rStart < slotEnd && rEnd > slotStart
    if (rStart < slotEnd && rEnd > slotStart) {
      return { occupied: true, reservation: r };
    }
  }
  return { occupied: false };
}

function getDayLabel(date: Date): string {
  if (isToday(date)) return "Dnes";
  if (isTomorrow(date)) return "Zítra";
  return format(date, "EEEE d. M.", { locale: cs });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BookingTimeline({
  reservations,
  date,
  resourceName,
  startHour = 6,
  endHour = 20,
  className,
}: BookingTimelineProps) {
  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = startHour; h < endHour; h++) arr.push(h);
    return arr;
  }, [startHour, endHour]);

  const currentHour = new Date().getHours();

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {resourceName}
          </p>
          <p className="text-xs capitalize text-foreground-muted">
            {getDayLabel(date)}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-foreground-muted">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Volné
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Obsazeno
          </span>
        </div>
      </div>

      {/* Timeline — horizontal scroll */}
      <div className="overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex gap-1" style={{ minWidth: hours.length * 52 }}>
          {hours.map((h) => {
            const { occupied, reservation } = getSlotStatus(
              h,
              reservations,
              date,
            );
            const isPast = isToday(date) && h < currentHour;
            const isCurrent = isToday(date) && h === currentHour;

            return (
              <div key={h} className="flex flex-col items-center gap-1.5">
                {/* Hour label */}
                <span
                  className={cn(
                    "text-[11px] font-medium tabular-nums",
                    isCurrent
                      ? "text-accent font-bold"
                      : isPast
                        ? "text-foreground-muted"
                        : "text-foreground-secondary",
                  )}
                >
                  {String(h).padStart(2, "0")}:00
                </span>

                {/* Slot block */}
                <div
                  className={cn(
                    "group relative flex h-12 w-11 items-center justify-center rounded-lg border transition-colors",
                    occupied
                      ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30"
                      : isPast
                        ? "border-slate-100 dark:border-slate-700 bg-background"
                        : "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30",
                    isCurrent && "ring-2 ring-accent ring-offset-1 dark:ring-offset-background",
                  )}
                  title={
                    occupied && reservation
                      ? `${reservation.user.name}`
                      : "Volné"
                  }
                >
                  {/* Status dot */}
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      occupied
                        ? "bg-red-500"
                        : isPast
                          ? "bg-border"
                          : "bg-emerald-500",
                    )}
                  />

                  {/* Tooltip on hover */}
                  {occupied && reservation && (
                    <div className="pointer-events-none absolute -top-10 left-1/2 z-10 hidden -translate-x-1/2 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg group-hover:block whitespace-nowrap">
                      {reservation.user.name}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary text */}
      {reservations.length === 0 ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <Clock className="h-3.5 w-3.5" />
          Celý den volný
        </p>
      ) : (
        <p className="mt-2 text-xs text-foreground-muted">
          {reservations.length}{" "}
          {reservations.length === 1
            ? "rezervace"
            : reservations.length < 5
              ? "rezervace"
              : "rezervací"}{" "}
          tento den
        </p>
      )}
    </div>
  );
}
