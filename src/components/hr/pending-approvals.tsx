"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { approveRequest, rejectRequest } from "@/actions/hr";
import { toast } from "sonner";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

const TYPE_LABELS: Record<string, string> = {
  VACATION: "🏖️ Dovolená",
  SICK_DAY: "🤒 Sick day",
  DOCTOR: "🩺 Lékař",
  PERSONAL_DAY: "🧘 Osobní volno",
  HOME_OFFICE: "🏠 Home office",
};

interface PendingRequest {
  id: string;
  type: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  totalHours: number;
  isOverLimit: boolean;
  reason: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
    position: string | null;
    department: { name: string; code: string; color: string | null } | null;
  };
}

interface PendingApprovalsProps {
  requests: PendingRequest[];
}

export function PendingApprovals({ requests }: PendingApprovalsProps) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-12 text-center">
        <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-300 dark:text-emerald-700" />
        <p className="text-sm font-medium text-foreground-secondary">
          Žádné čekající žádosti
        </p>
        <p className="mt-1 text-xs text-foreground-muted">
          Všechny žádosti jsou vyřízeny 🎉
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req, i) => (
        <ApprovalCard key={req.id} request={req} index={i} />
      ))}
    </div>
  );
}

function ApprovalCard({
  request,
  index,
}: {
  request: PendingRequest;
  index: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    "pending" | "approved" | "rejected"
  >("pending");
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");

  const handleApprove = () => {
    startTransition(async () => {
      try {
        const result = await approveRequest(request.id, note || undefined);
        if (result.success) {
          setStatus("approved");
          toast.success(`Žádost ${request.user.name} schválena`);
        } else {
          toast.error("Nepodařilo se schválit žádost");
        }
      } catch {
        toast.error("Chyba při schvalování žádosti");
      }
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      try {
        const result = await rejectRequest(request.id, note || undefined);
        if (result.success) {
          setStatus("rejected");
          toast.success(`Žádost ${request.user.name} zamítnuta`);
        } else {
          toast.error("Nepodařilo se zamítnout žádost");
        }
      } catch {
        toast.error("Chyba při zamítání žádosti");
      }
    });
  };

  if (status === "approved") {
    return (
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 animate-fadeInUp">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-semibold">
            Žádost {request.user.name} schválena
          </span>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 animate-fadeInUp">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
          <XCircle className="h-5 w-5" />
          <span className="text-sm font-semibold">
            Žádost {request.user.name} zamítnuta
          </span>
        </div>
      </div>
    );
  }

  const initials = request.user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-sm transition-all",
        isPending && "opacity-60 pointer-events-none",
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Header: User info */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-blue-700 text-sm font-bold text-white overflow-hidden">
          {request.user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={request.user.avatarUrl}
              alt={request.user.name}
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground truncate">
              {request.user.name}
            </p>
            {request.user.department && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor:
                    (request.user.department.color ?? "#e2e8f0") + "20",
                  color: request.user.department.color ?? "#64748b",
                }}
              >
                {request.user.department.code}
              </span>
            )}
          </div>
          {request.user.position && (
            <p className="text-xs text-foreground-muted truncate">
              {request.user.position}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 px-2 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
          <Clock className="h-3 w-3" />
          Čeká
        </div>
      </div>

      {/* Request details */}
      <div className="mt-3 rounded-xl bg-background-secondary p-3 space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {TYPE_LABELS[request.type] ?? request.type}
        </p>
        <p className="text-xs text-foreground-secondary">
          {format(new Date(request.startDate), "d. MMMM yyyy", { locale: cs })}
          {new Date(request.startDate).getTime() !==
            new Date(request.endDate).getTime() &&
            ` — ${format(new Date(request.endDate), "d. MMMM yyyy", { locale: cs })}`}
          <span className="ml-1.5 font-medium text-foreground-secondary">
            ({request.totalHours}h)
            {request.isOverLimit && (
              <span className="ml-1 text-red-500 font-semibold">⚠️ PŘEČERPÁNÍ</span>
            )}
          </span>
        </p>
        {request.reason && (
          <p className="text-xs text-foreground-muted italic">
            „{request.reason}“
          </p>
        )}
        <p className="text-[10px] text-foreground-muted">
          Odesláno {format(new Date(request.createdAt), "d. MMM yyyy, HH:mm", { locale: cs })}
        </p>
      </div>

      {/* Note input (toggleable) */}
      {showNote && (
        <div className="mt-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-foreground-muted" />
            <span className="text-xs text-foreground-secondary">
              Poznámka (volitelná)
            </span>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Např. důvod zamítnutí..."
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
            rows={2}
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition-all active:scale-[0.97] hover:bg-emerald-700 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          Schválit
        </button>
        <button
          onClick={handleReject}
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-600/20 transition-all active:scale-[0.97] hover:bg-red-700 disabled:opacity-50"
        >
          <XCircle className="h-4 w-4" />
          Zamítnout
        </button>
        <button
          onClick={() => setShowNote(!showNote)}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
            showNote
              ? "border-accent/50 bg-accent-light text-accent-text"
              : "border-border text-foreground-muted hover:text-foreground-secondary hover:border-border",
          )}
          title="Přidat poznámku"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
