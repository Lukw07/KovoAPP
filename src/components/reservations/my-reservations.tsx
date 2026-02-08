"use client";

// ============================================================================
// MyReservations — list of user's reservations with cancel action
// ============================================================================

import { useState, useTransition } from "react";
import { cancelReservation } from "@/actions/reservations";
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
    color: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-700/50",
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

  const handleCancel = (id: string) => {
    setCancellingId(id);
    startTransition(async () => {
      await cancelReservation(id);
      setCancellingId(null);
    });
  };

  if (reservations.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">
        Moje rezervace
      </h2>

      <ul className="space-y-2">
        {reservations.map((r) => {
          const st = STATUS_CFG[r.status] ?? STATUS_CFG.PENDING;
          const StIcon = st.icon;
          const TypeIcon = TYPE_ICONS[r.resource.type] ?? Wrench;
          const canCancel =
            r.status === "PENDING" || r.status === "CONFIRMED";

          return (
            <li
              key={r.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                {/* Type icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background-secondary">
                  <TypeIcon className="h-4.5 w-4.5 text-foreground-secondary" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {r.resource.name}
                    </p>
                    <div
                      className={cn(
                        "flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium",
                        st.bg,
                        st.color,
                      )}
                    >
                      <StIcon className="h-3 w-3" />
                      {st.label}
                    </div>
                  </div>

                  <p className="mt-0.5 text-xs text-foreground-secondary">
                    {format(new Date(r.startTime), "d. M. HH:mm", {
                      locale: cs,
                    })}{" "}
                    –{" "}
                    {format(new Date(r.endTime), "d. M. HH:mm", {
                      locale: cs,
                    })}
                  </p>

                  {r.purpose && (
                    <p className="mt-1 text-xs text-foreground-muted truncate">
                      {r.purpose}
                    </p>
                  )}

                  {/* Cancel button */}
                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => handleCancel(r.id)}
                      disabled={isPending && cancellingId === r.id}
                      className="mt-2 flex items-center gap-1 rounded-lg bg-red-50 dark:bg-red-900/30 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {isPending && cancellingId === r.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      Zrušit
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
