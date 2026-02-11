"use client";

// ============================================================================
// RequestsClient — tabbed wrapper: Seznam (list) | Kalendář (calendar)
// ============================================================================

import { useState } from "react";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  List,
  CalendarRange,
} from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  RequestsCalendar,
  type CalendarRequest,
} from "@/components/hr/requests-calendar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RequestItem = {
  id: string;
  type: string;
  status: string;
  startDate: Date | string;
  endDate: Date | string;
  totalDays: number;
  totalHours: number;
  isOverLimit: boolean;
  reason: string | null;
  note: string | null;
  approver?: { name: string | null } | null;
};

interface RequestsClientProps {
  items: RequestItem[];
  total: number;
  calendarRequests: CalendarRequest[];
  calendarYear: number;
  calendarMonth: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  { icon: typeof Clock; label: string; color: string; bg: string }
> = {
  PENDING: {
    icon: Clock,
    label: "Čeká na schválení",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
  },
  APPROVED: {
    icon: CheckCircle2,
    label: "Schváleno",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
  },
  REJECTED: {
    icon: XCircle,
    label: "Zamítnuto",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/30",
  },
  CANCELLED: {
    icon: Ban,
    label: "Zrušeno",
    color: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-700/50",
  },
};

const TYPE_LABELS: Record<string, string> = {
  VACATION: "🏖️ Dovolená",
  SICK_DAY: "🤒 Sick day",
  DOCTOR: "🩺 Lékař",
  PERSONAL_DAY: "🧘 Osobní volno",
  HOME_OFFICE: "🏠 Home office",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RequestsClient({
  items,
  total,
  calendarRequests,
  calendarYear,
  calendarMonth,
}: RequestsClientProps) {
  const [tab, setTab] = useState<"list" | "calendar">("list");

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-background-secondary p-1">
        <button
          onClick={() => setTab("list")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all",
            tab === "list"
              ? "bg-card text-foreground shadow-sm"
              : "text-foreground-muted hover:text-foreground-secondary",
          )}
        >
          <List className="h-4 w-4" />
          Seznam
        </button>
        <button
          onClick={() => setTab("calendar")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all",
            tab === "calendar"
              ? "bg-card text-foreground shadow-sm"
              : "text-foreground-muted hover:text-foreground-secondary",
          )}
        >
          <CalendarRange className="h-4 w-4" />
          Kalendář
        </button>
      </div>

      {/* ── List View ──────────────────────────────────────────────────── */}
      {tab === "list" && (
        <>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
              <CalendarDays className="mb-3 h-12 w-12 text-foreground-muted" />
              <p className="text-sm font-medium text-foreground-secondary">
                Zatím nemáte žádné žádosti
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                Klikněte na &quot;+ Nová žádost&quot; pro vytvoření
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-foreground-muted">
                Celkem {total}{" "}
                {total === 1 ? "žádost" : total < 5 ? "žádosti" : "žádostí"}
              </p>
              <ul className="space-y-3">
                {items.map((req) => {
                  const status =
                    STATUS_CONFIG[req.status] ?? STATUS_CONFIG.PENDING;
                  const StatusIcon = status.icon;

                  return (
                    <li
                      key={req.id}
                      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            {TYPE_LABELS[req.type] ?? req.type}
                          </p>
                          <p className="mt-0.5 text-xs text-foreground-secondary">
                            {format(new Date(req.startDate), "d. MMM yyyy", {
                              locale: cs,
                            })}
                            {new Date(req.startDate).getTime() !==
                              new Date(req.endDate).getTime() &&
                              ` — ${format(new Date(req.endDate), "d. MMM yyyy", { locale: cs })}`}
                            <span className="ml-1.5 text-foreground-muted">
                              ({req.totalHours}h)
                            </span>
                          </p>
                          {req.reason && (
                            <p className="mt-1.5 text-xs text-foreground-muted line-clamp-2">
                              {req.reason}
                            </p>
                          )}
                          {req.note && (
                            <p className="mt-1.5 rounded-lg bg-background-secondary px-2.5 py-1.5 text-xs text-foreground-secondary italic">
                              📝 {req.note}
                            </p>
                          )}
                          {req.approver && (
                            <p className="mt-1 text-xs text-foreground-muted">
                              Schválil/a: {req.approver.name}
                            </p>
                          )}
                        </div>

                        {/* Status badge */}
                        <div
                          className={cn(
                            "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap",
                            status.bg,
                            status.color,
                          )}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}

      {/* ── Calendar View ──────────────────────────────────────────────── */}
      {tab === "calendar" && (
        <RequestsCalendar
          initialRequests={calendarRequests}
          initialYear={calendarYear}
          initialMonth={calendarMonth}
        />
      )}
    </div>
  );
}
