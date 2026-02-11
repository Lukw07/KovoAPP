"use client";

// ============================================================================
// ReservationsClient — redesigned reservation flow
// Single-page: resource list → resource detail w/ unified timeline + booking
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import ResourceList from "@/components/reservations/resource-list";
import BookingForm from "@/components/reservations/booking-form";
import { getResourceReservations } from "@/actions/reservation-queries";
import {
  addDays,
  addHours,
  startOfDay,
  format,
  isToday,
  isTomorrow,
} from "date-fns";
import { cs } from "date-fns/locale";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Car,
  DoorOpen,
  Wrench,
  CircleParking,
  Clock,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types & config
// ---------------------------------------------------------------------------

type Resource = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  location: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  metadata: unknown;
};

type TimelineReservation = {
  id: string;
  startTime: Date | string;
  endTime: Date | string;
  status: string;
  user: { id: string; name: string; avatarUrl: string | null };
};

const TYPE_META: Record<
  string,
  { icon: typeof Car; color: string; bg: string; label: string }
> = {
  CAR: {
    icon: Car,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/30",
    label: "Auto",
  },
  ROOM: {
    icon: DoorOpen,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    label: "Místnost",
  },
  TOOL: {
    icon: Wrench,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    label: "Nástroj",
  },
  PARKING_SPOT: {
    icon: CircleParking,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/30",
    label: "Parkování",
  },
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ReservationsClientProps {
  resources: Resource[];
}

export default function ReservationsClient({
  resources,
}: ReservationsClientProps) {
  const [selected, setSelected] = useState<Resource | null>(null);
  const [dateOffset, setDateOffset] = useState(0);
  const [activeDay, setActiveDay] = useState<0 | 1>(0); // 0=day1 1=day2
  const [day1Reservations, setDay1Reservations] = useState<
    TimelineReservation[]
  >([]);
  const [day2Reservations, setDay2Reservations] = useState<
    TimelineReservation[]
  >([]);
  const [loading, setLoading] = useState(false);

  const day1 = startOfDay(addDays(new Date(), dateOffset));
  const day2 = addDays(day1, 1);

  const reservations = activeDay === 0 ? day1Reservations : day2Reservations;
  const activeDate = activeDay === 0 ? day1 : day2;

  const fetchTimeline = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const [d1, d2] = await Promise.all([
        getResourceReservations(selected.id, day1, 1),
        getResourceReservations(selected.id, day2, 1),
      ]);
      setDay1Reservations(d1);
      setDay2Reservations(d2);
    } finally {
      setLoading(false);
    }
  }, [selected, dateOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // ---- List view ----
  if (!selected) {
    return <ResourceList resources={resources} onSelect={setSelected} />;
  }

  const meta = TYPE_META[selected.type] ?? TYPE_META.TOOL;
  const Icon = meta.icon;

  // ---- Detail view ----
  return (
    <div className="space-y-4">
      {/* ─── Resource header ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setDateOffset(0);
              setActiveDay(0);
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background-secondary text-foreground-secondary active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              meta.bg
            )}
          >
            <Icon className={cn("h-5 w-5", meta.color)} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">
              {selected.name}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 text-xs text-foreground-muted">
              <span className={cn("font-medium", meta.color)}>
                {meta.label}
              </span>
              {selected.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {selected.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Unified timeline card ─────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Date navigation + day tabs */}
        <div className="border-b border-border px-4 pt-3 pb-0">
          {/* Date nav row */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setDateOffset((o) => o - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-background-secondary text-foreground-secondary active:scale-95 transition-transform"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-foreground-muted" />
              <span className="text-sm font-medium text-foreground">
                {format(day1, "d. MMMM", { locale: cs })}
                {" – "}
                {format(day2, "d. MMMM", { locale: cs })}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {dateOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDateOffset(0);
                    setActiveDay(0);
                  }}
                  className="rounded-lg bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent active:scale-95 transition-transform"
                >
                  Dnes
                </button>
              )}
              <button
                type="button"
                onClick={() => setDateOffset((o) => o + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-background-secondary text-foreground-secondary active:scale-95 transition-transform"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Day tabs */}
          <div className="flex">
            <DayTab
              date={day1}
              active={activeDay === 0}
              count={day1Reservations.length}
              onClick={() => setActiveDay(0)}
            />
            <DayTab
              date={day2}
              active={activeDay === 1}
              count={day2Reservations.length}
              onClick={() => setActiveDay(1)}
            />
          </div>
        </div>

        {/* Timeline content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
            </div>
          ) : (
            <InlineTimeline reservations={reservations} date={activeDate} />
          )}
        </div>
      </div>

      {/* ─── Booking form ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Nová rezervace
        </h3>
        <BookingForm
          resourceId={selected.id}
          resourceName={selected.name}
          onSuccess={() => fetchTimeline()}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DayTab — tab for switching between two days
// ---------------------------------------------------------------------------

function DayTab({
  date,
  active,
  count,
  onClick,
}: {
  date: Date;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  const label = isToday(date)
    ? "Dnes"
    : isTomorrow(date)
      ? "Zítra"
      : format(date, "EEEE", { locale: cs });

  const dateStr = format(date, "d. M.", { locale: cs });

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 border-b-2 px-3 pb-2.5 pt-1 text-center transition-colors",
        active
          ? "border-accent text-foreground"
          : "border-transparent text-foreground-muted hover:text-foreground-secondary"
      )}
    >
      <span className="text-xs font-semibold capitalize">{label}</span>
      <span className="text-[11px]">{dateStr}</span>
      {count > 0 && (
        <span
          className={cn(
            "mt-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
            active
              ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
              : "bg-background-secondary text-foreground-muted"
          )}
        >
          {count} rez.
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// InlineTimeline — compact hourly grid (no duplication)
// ---------------------------------------------------------------------------

function InlineTimeline({
  reservations,
  date,
  startHour = 6,
  endHour = 20,
}: {
  reservations: TimelineReservation[];
  date: Date;
  startHour?: number;
  endHour?: number;
}) {
  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = startHour; h < endHour; h++) arr.push(h);
    return arr;
  }, [startHour, endHour]);

  const currentHour = new Date().getHours();

  const getSlotStatus = (hour: number) => {
    const slotStart = addHours(startOfDay(date), hour);
    const slotEnd = addHours(slotStart, 1);

    for (const r of reservations) {
      const rStart = new Date(r.startTime);
      const rEnd = new Date(r.endTime);
      if (rStart < slotEnd && rEnd > slotStart) {
        return { occupied: true, reservation: r };
      }
    }
    return { occupied: false, reservation: undefined };
  };

  const totalSlots = hours.length;
  const occupiedSlots = hours.filter((h) => getSlotStatus(h).occupied).length;
  const freeSlots = totalSlots - occupiedSlots;

  return (
    <div className="space-y-3">
      {/* Summary line */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-foreground-secondary">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {freeSlots} h volných
          </span>
          {occupiedSlots > 0 && (
            <span className="flex items-center gap-1.5 text-foreground-secondary">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {occupiedSlots} h obsazeno
            </span>
          )}
        </div>

        {reservations.length === 0 && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Clock className="h-3.5 w-3.5" />
            Celý den volný
          </span>
        )}
      </div>

      {/* Hourly grid */}
      <div className="overflow-x-auto pb-1 scrollbar-hide">
        <div className="flex gap-1" style={{ minWidth: hours.length * 46 }}>
          {hours.map((h) => {
            const { occupied, reservation } = getSlotStatus(h);
            const isPast = isToday(date) && h < currentHour;
            const isCurrent = isToday(date) && h === currentHour;

            return (
              <div key={h} className="flex flex-col items-center gap-1">
                {/* Hour label */}
                <span
                  className={cn(
                    "text-[10px] font-medium tabular-nums",
                    isCurrent
                      ? "text-accent font-bold"
                      : isPast
                        ? "text-foreground-muted/50"
                        : "text-foreground-secondary"
                  )}
                >
                  {String(h).padStart(2, "0")}
                </span>

                {/* Slot */}
                <div
                  className={cn(
                    "group relative flex h-10 w-10 items-center justify-center rounded-lg border transition-colors",
                    occupied
                      ? "border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/30"
                      : isPast
                        ? "border-border/50 bg-background-secondary/50"
                        : "border-border bg-background-secondary/60 dark:bg-background-secondary/40",
                    isCurrent &&
                      "ring-2 ring-accent ring-offset-1 dark:ring-offset-card"
                  )}
                  title={
                    occupied && reservation
                      ? `${reservation.user.name}`
                      : "Volné"
                  }
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      occupied
                        ? "bg-red-500"
                        : isPast
                          ? "bg-border"
                          : "bg-foreground-muted/40"
                    )}
                  />

                  {/* Tooltip */}
                  {occupied && reservation && (
                    <div className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 rounded-lg bg-foreground px-2.5 py-1.5 text-[11px] font-medium text-background shadow-lg group-hover:block whitespace-nowrap">
                      {reservation.user.name}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active reservations list for the day */}
      {reservations.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground-secondary">
            Rezervace tento den
          </p>
          {reservations.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 rounded-xl bg-background-secondary px-3 py-2"
            >
              <div className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
              <span className="text-xs font-medium text-foreground">
                {format(new Date(r.startTime), "HH:mm")} –{" "}
                {format(new Date(r.endTime), "HH:mm")}
              </span>
              <span className="text-xs text-foreground-muted">
                {r.user.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
