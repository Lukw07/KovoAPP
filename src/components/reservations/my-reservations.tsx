"use client";

// ============================================================================
// MyReservations — user's reservations split into active / past
// ============================================================================

import { useState, useTransition, useMemo } from "react";
import { cancelReservation } from "@/actions/reservations";
import { toast } from "sonner";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Car,
  DoorOpen,
  Wrench,
  CircleParking,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Loader2,
  CalendarCheck,
  History,
  ChevronDown,
} from "lucide-react";

type Res = {
  id: string;
  startTime: Date | string;
  endTime: Date | string;
  status: string;
  purpose: string | null;
  resource: {
    id: string;
    name: string;
    type: string;
    location: string | null;
  };
};

const STATUS_CFG: Record<
  string,
  { icon: typeof Clock; label: string; color: string; bg: string }
> = {
  PENDING: {
    icon: Clock,
    label: "Čeká",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
  },
  CONFIRMED: {
    icon: CheckCircle2,
    label: "Potvrzeno",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
  },
  CANCELLED: {
    icon: XCircle,
    label: "Zrušeno",
    color: "text-red-500 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/30",
  },
  COMPLETED: {
    icon: Ban,
    label: "Dokončeno",
    color: "text-foreground-secondary",
    bg: "bg-background-secondary",
  },
};

const TYPE_ICONS: Record<string, typeof Car> = {
  CAR: Car,
  ROOM: DoorOpen,
  TOOL: Wrench,
  PARKING_SPOT: CircleParking,
};

export default function MyReservations({
  reservations,
}: {
  reservations: Res[];
}) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showPast, setShowPast] = useState(false);

  const handleCancel = (id: string) => {
    setCancellingId(id);
    startTransition(async () => {
      try {
        await cancelReservation(id);
        toast.success("Rezervace zrušena");
      } catch {
        toast.error("Nepodařilo se zrušit rezervaci");
      }
      setCancellingId(null);
    });
  };

  // Split into active (upcoming / pending / confirmed) and past (cancelled / completed / ended)
  const { active, past } = useMemo(() => {
    const now = new Date();
    const activeList: Res[] = [];
    const pastList: Res[] = [];

    for (const r of reservations) {
      const endDate = new Date(r.endTime);
      const isActive =
        (r.status === "PENDING" || r.status === "CONFIRMED") &&
        endDate > now;

      if (isActive) {
        activeList.push(r);
      } else {
        pastList.push(r);
      }
    }

    return { active: activeList, past: pastList };
  }, [reservations]);

  if (reservations.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* ─── Active reservations ─────────────────────────────────────── */}
      {active.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">
              Aktivní rezervace
            </h2>
            <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent">
              {active.length}
            </span>
          </div>

          <ul className="space-y-2">
            {active.map((r) => (
              <ReservationCard
                key={r.id}
                reservation={r}
                onCancel={handleCancel}
                cancelling={isPending && cancellingId === r.id}
              />
            ))}
          </ul>
        </div>
      )}

      {/* ─── Past reservations (collapsible) ─────────────────────────── */}
      {past.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowPast((p) => !p)}
            className="flex w-full items-center gap-2 text-left"
          >
            <History className="h-4 w-4 text-foreground-muted" />
            <span className="text-sm font-semibold text-foreground-secondary">
              Historie
            </span>
            <span className="rounded-md bg-background-secondary px-1.5 py-0.5 text-xs font-medium text-foreground-muted">
              {past.length}
            </span>
            <ChevronDown
              className={cn(
                "ml-auto h-4 w-4 text-foreground-muted transition-transform",
                showPast && "rotate-180"
              )}
            />
          </button>

          {showPast && (
            <ul className="space-y-2">
              {past.slice(0, 10).map((r) => (
                <ReservationCard
                  key={r.id}
                  reservation={r}
                  onCancel={handleCancel}
                  cancelling={isPending && cancellingId === r.id}
                  dimmed
                />
              ))}
              {past.length > 10 && (
                <p className="py-2 text-center text-xs text-foreground-muted">
                  … a dalších {past.length - 10} rezervací
                </p>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReservationCard — single reservation row
// ---------------------------------------------------------------------------

function ReservationCard({
  reservation: r,
  onCancel,
  cancelling,
  dimmed = false,
}: {
  reservation: Res;
  onCancel: (id: string) => void;
  cancelling: boolean;
  dimmed?: boolean;
}) {
  const st = STATUS_CFG[r.status] ?? STATUS_CFG.PENDING;
  const StIcon = st.icon;
  const TypeIcon = TYPE_ICONS[r.resource.type] ?? Wrench;
  const canCancel = r.status === "PENDING" || r.status === "CONFIRMED";

  return (
    <li
      className={cn(
        "rounded-2xl border border-border bg-card p-3.5 shadow-sm transition-opacity",
        dimmed && "opacity-60"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Type icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background-secondary">
          <TypeIcon className="h-4 w-4 text-foreground-secondary" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {r.resource.name}
            </p>
            <div
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium",
                st.bg,
                st.color
              )}
            >
              <StIcon className="h-3 w-3" />
              {st.label}
            </div>
          </div>

          <p className="mt-0.5 text-xs text-foreground-secondary">
            {format(new Date(r.startTime), "d. M. HH:mm", { locale: cs })}
            {" – "}
            {format(new Date(r.endTime), "d. M. HH:mm", { locale: cs })}
          </p>

          {r.purpose && (
            <p className="mt-0.5 text-xs text-foreground-muted truncate">
              {r.purpose}
            </p>
          )}
        </div>

        {/* Cancel button — inline, not below */}
        {canCancel && !dimmed && (
          <button
            type="button"
            onClick={() => onCancel(r.id)}
            disabled={cancelling}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 active:scale-95 transition-transform disabled:opacity-50"
            title="Zrušit rezervaci"
          >
            {cancelling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
    </li>
  );
}
