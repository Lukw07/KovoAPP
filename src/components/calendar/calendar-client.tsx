"use client";

import { useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
  Star,
  CalendarDays,
} from "lucide-react";
import {
  getCalendarEvents,
  getHolidaysForYear,
  createCalendarEvent,
  deleteCalendarEvent,
} from "@/actions/calendar";
import type { CalendarEventData, HolidayData } from "@/actions/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// MONTH NAMES
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

const DAY_NAMES = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

const EVENT_COLORS = [
  { value: "#3B82F6", label: "Modrá" },
  { value: "#22C55E", label: "Zelená" },
  { value: "#F97316", label: "Oranžová" },
  { value: "#EF4444", label: "Červená" },
  { value: "#8B5CF6", label: "Fialová" },
  { value: "#EC4899", label: "Růžová" },
];

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

// ---------------------------------------------------------------------------
// CREATE EVENT FORM
// ---------------------------------------------------------------------------

function CreateEventForm({
  onClose,
  selectedDate,
}: {
  onClose: () => void;
  selectedDate?: Date;
}) {
  const [isPending, startTransition] = useTransition();
  const [color, setColor] = useState(EVENT_COLORS[0].value);

  const defaultDate = selectedDate
    ? selectedDate.toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("color", color);

    startTransition(async () => {
      const result = await createCalendarEvent(fd);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Událost vytvořena");
        onClose();
      }
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Nová událost</h3>
        <button onClick={onClose} className="text-foreground-muted hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          name="title"
          placeholder="Název události"
          required
          maxLength={200}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />

        <textarea
          name="description"
          placeholder="Popis (volitelné)"
          rows={2}
          maxLength={2000}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
        />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Datum</label>
            <input
              name="date"
              type="date"
              required
              defaultValue={defaultDate}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Konec (volitelné)</label>
            <input
              name="endDate"
              type="date"
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>

        {/* Color picker */}
        <div>
          <label className="text-xs text-foreground-muted mb-1.5 block">Barva</label>
          <div className="flex gap-2">
            {EVENT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={cn(
                  "h-7 w-7 rounded-full transition-all",
                  color === c.value ? "ring-2 ring-offset-2 ring-offset-card scale-110" : "opacity-60 hover:opacity-100",
                )}
                style={{ backgroundColor: c.value, ["--tw-ring-color" as string]: c.value }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-hover active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {isPending ? "Ukládám..." : "Přidat událost"}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DAY DETAIL
// ---------------------------------------------------------------------------

function DayDetail({
  date,
  events,
  holidays,
  canManage,
  onClose,
  onDelete,
}: {
  date: Date;
  events: CalendarEventData[];
  holidays: HolidayData[];
  canManage: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const dayHolidays = holidays.filter((h) => isSameDay(new Date(h.date), date));
  const dayEvents = events.filter((e) => isSameDay(new Date(e.date), date));

  const dayStr = date.toLocaleDateString("cs-CZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground capitalize">{dayStr}</h3>
        <button onClick={onClose} className="text-foreground-muted hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Holidays */}
      {dayHolidays.map((h) => (
        <div
          key={h.name}
          className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 p-3 border border-red-200 dark:border-red-800"
        >
          <Star className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-sm font-medium text-red-700 dark:text-red-400">
            {h.name}
          </span>
        </div>
      ))}

      {/* Events */}
      {dayEvents.length === 0 && dayHolidays.length === 0 && (
        <p className="text-xs text-foreground-muted text-center py-4">
          Žádné události
        </p>
      )}

      {dayEvents.map((event) => (
        <div
          key={event.id}
          className="flex items-start gap-2 rounded-xl p-3 border border-border"
          style={{ borderLeftColor: event.color || "#3B82F6", borderLeftWidth: "3px" }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{event.title}</p>
            {event.description && (
              <p className="text-xs text-foreground-muted mt-0.5 line-clamp-2">
                {event.description}
              </p>
            )}
            <p className="text-[10px] text-foreground-muted mt-1">
              {event.creator.name}
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => onDelete(event.id)}
              className="text-foreground-muted hover:text-red-500 transition-colors flex-shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN CALENDAR CLIENT
// ---------------------------------------------------------------------------

interface CalendarClientProps {
  initialEvents: CalendarEventData[];
  holidays: HolidayData[];
  canManage: boolean;
  initialYear: number;
  initialMonth: number;
}

export function CalendarClient({
  initialEvents,
  holidays: initialHolidays,
  canManage,
  initialYear,
  initialMonth,
}: CalendarClientProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [events, setEvents] = useState<CalendarEventData[]>(initialEvents);
  const [holidays, setHolidays] = useState<HolidayData[]>(initialHolidays);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();

  const today = new Date();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

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
    setShowCreate(false);

    // Fetch events and holidays for new month/year
    startTransition(async () => {
      const [newEvents, newHolidays] = await Promise.all([
        getCalendarEvents(newYear, newMonth),
        getHolidaysForYear(newYear),
      ]);
      setEvents(newEvents);
      setHolidays(newHolidays);
    });
  };

  const handleDelete = (eventId: string) => {
    startTransition(async () => {
      const result = await deleteCalendarEvent(eventId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
        toast.success("Událost smazána");
      }
    });
  };

  const handleCreateClose = () => {
    setShowCreate(false);
    // Refresh events
    startTransition(async () => {
      const newEvents = await getCalendarEvents(year, month);
      setEvents(newEvents);
    });
  };

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // Helper to check if a day has events/holidays
  const getDayInfo = (day: number) => {
    const date = new Date(year, month - 1, day);
    const hasHoliday = holidays.some((h) => isSameDay(new Date(h.date), date));
    const dayEvents = events.filter((e) => isSameDay(new Date(e.date), date));
    const isToday = isSameDay(date, today);
    const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    return { hasHoliday, dayEvents, isToday, isSelected, isWeekend };
  };

  return (
    <div className="space-y-4">
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

      {/* Add event button (managers/admins) */}
      {canManage && !showCreate && (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-3 text-sm font-medium text-foreground-muted hover:text-accent hover:border-accent/50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Přidat událost
        </button>
      )}

      {/* Create event form */}
      {showCreate && (
        <CreateEventForm onClose={handleCreateClose} selectedDate={selectedDate || undefined} />
      )}

      {/* Calendar grid */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              className="py-2 text-center text-[11px] font-semibold text-foreground-muted"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-12 border-b border-r border-border/50" />;
            }

            const { hasHoliday, dayEvents, isToday, isSelected, isWeekend } = getDayInfo(day);

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(new Date(year, month - 1, day))}
                className={cn(
                  "relative h-12 flex flex-col items-center justify-center border-b border-r border-border/50 transition-colors",
                  "hover:bg-background-secondary",
                  isSelected && "bg-accent/10 ring-1 ring-accent ring-inset",
                  isToday && !isSelected && "bg-blue-50 dark:bg-blue-900/20",
                  isWeekend && !isSelected && !isToday && "bg-slate-50 dark:bg-slate-800/30",
                  hasHoliday && "text-red-600 dark:text-red-400",
                )}
              >
                <span
                  className={cn(
                    "text-xs font-medium",
                    isToday && "flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white",
                    hasHoliday && !isToday && "font-bold",
                  )}
                >
                  {day}
                </span>

                {/* Dots for events */}
                {(dayEvents.length > 0 || hasHoliday) && (
                  <div className="absolute bottom-0.5 flex gap-0.5">
                    {hasHoliday && (
                      <span className="h-1 w-1 rounded-full bg-red-500" />
                    )}
                    {dayEvents.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className="h-1 w-1 rounded-full"
                        style={{ backgroundColor: e.color || "#3B82F6" }}
                      />
                    ))}
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
          events={events}
          holidays={holidays}
          canManage={canManage}
          onClose={() => setSelectedDate(null)}
          onDelete={handleDelete}
        />
      )}

      {/* Upcoming holidays legend */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-red-500" />
          Svátky v {MONTH_NAMES[month - 1].toLowerCase()}u
        </h3>
        {(() => {
          const monthHolidays = holidays.filter((h) => {
            const d = new Date(h.date);
            return d.getMonth() === month - 1;
          });
          if (monthHolidays.length === 0) {
            return (
              <p className="text-xs text-foreground-muted">
                V tomto měsíci nejsou žádné svátky
              </p>
            );
          }
          return monthHolidays.map((h) => (
            <div
              key={h.name}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-foreground-secondary">{h.name}</span>
              <span className="text-foreground-muted font-medium tabular-nums">
                {new Date(h.date).toLocaleDateString("cs-CZ", {
                  day: "numeric",
                  month: "numeric",
                })}
              </span>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
