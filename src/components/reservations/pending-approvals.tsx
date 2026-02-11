"use client";

// ============================================================================
// PendingApprovals — manager/admin panel to approve/reject reservations
// ============================================================================

import { useState, useTransition } from "react";
import { approveReservation, rejectReservation } from "@/actions/reservations";
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
  Loader2,
  ShieldCheck,
} from "lucide-react";

type PendingRes = {
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
  user: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
};

const TYPE_ICONS: Record<string, typeof Car> = {
  CAR: Car,
  ROOM: DoorOpen,
  TOOL: Wrench,
  PARKING_SPOT: CircleParking,
};

export default function PendingApprovals({
  reservations,
}: {
  reservations: PendingRes[];
}) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (reservations.length === 0) return null;

  const handleApprove = (id: string) => {
    setProcessingId(id);
    startTransition(async () => {
      const result = await approveReservation(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Rezervace schválena");
      }
      setProcessingId(null);
    });
  };

  const handleReject = (id: string) => {
    setProcessingId(id);
    startTransition(async () => {
      const result = await rejectReservation(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Rezervace zamítnuta");
      }
      setProcessingId(null);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-foreground">
          Čekající na schválení
        </h2>
        <span className="rounded-md bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
          {reservations.length}
        </span>
      </div>

      <ul className="space-y-2">
        {reservations.map((r) => {
          const TypeIcon = TYPE_ICONS[r.resource.type] ?? Wrench;
          const isProcessing = isPending && processingId === r.id;

          return (
            <li
              key={r.id}
              className="rounded-2xl border border-amber-200/60 dark:border-amber-700/30 bg-card p-3.5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                {/* Type icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/30">
                  <TypeIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {r.resource.name}
                    </p>
                    <div className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      <Clock className="h-3 w-3" />
                      Čeká
                    </div>
                  </div>

                  <p className="mt-0.5 text-xs text-foreground-secondary">
                    {r.user.name ?? "Neznámý"} •{" "}
                    {format(new Date(r.startTime), "d. M. HH:mm", {
                      locale: cs,
                    })}
                    {" – "}
                    {format(new Date(r.endTime), "d. M. HH:mm", {
                      locale: cs,
                    })}
                  </p>

                  {r.purpose && (
                    <p className="mt-0.5 text-xs text-foreground-muted truncate">
                      {r.purpose}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleApprove(r.id)}
                    disabled={isProcessing}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
                      "active:scale-95 transition-transform disabled:opacity-50",
                    )}
                    title="Schválit"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(r.id)}
                    disabled={isProcessing}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
                      "active:scale-95 transition-transform disabled:opacity-50",
                    )}
                    title="Zamítnout"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
