import { getMyRequests, getPendingForManager } from "@/actions/hr-queries";
import { auth } from "@/lib/auth";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PendingApprovals } from "@/components/hr/pending-approvals";

export const metadata = { title: "Moje žádosti" };

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
// Page
// ---------------------------------------------------------------------------

export default async function RequestsPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isManagement = role === "ADMIN" || role === "MANAGER";

  const [{ items, total }, pendingRequests] = await Promise.all([
    getMyRequests(),
    isManagement ? getPendingForManager() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      {/* ── Manager/Admin: Pending approvals section ─────────────────── */}
      {isManagement && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Ke schválení
            </h2>
            {pendingRequests.length > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white px-1.5">
                {pendingRequests.length}
              </span>
            )}
          </div>
          <PendingApprovals requests={pendingRequests} />
        </div>
      )}

      {/* ── Separator between sections ───────────────────────────────── */}
      {isManagement && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Moje žádosti
          </span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Moje žádosti
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Celkem {total}{" "}
            {total === 1 ? "žádost" : total < 5 ? "žádosti" : "žádostí"}
          </p>
        </div>
        <Link
          href="/requests/new"
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 active:scale-[0.97] transition-transform"
        >
          + Nová žádost
        </Link>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-16 text-center">
          <CalendarDays className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Zatím nemáte žádné žádosti
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Klikněte na &quot;+ Nová žádost&quot; pro vytvoření
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((req) => {
            const status = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.PENDING;
            const StatusIcon = status.icon;

            return (
              <li
                key={req.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {TYPE_LABELS[req.type] ?? req.type}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {format(new Date(req.startDate), "d. MMM yyyy", {
                        locale: cs,
                      })}
                      {new Date(req.startDate).getTime() !==
                        new Date(req.endDate).getTime() &&
                        ` — ${format(new Date(req.endDate), "d. MMM yyyy", { locale: cs })}`}
                      <span className="ml-1.5 text-slate-400">
                        ({req.totalDays}{" "}
                        {req.totalDays === 1
                          ? "den"
                          : req.totalDays < 5
                            ? "dny"
                            : "dní"})
                      </span>
                    </p>
                    {req.reason && (
                      <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">
                        {req.reason}
                      </p>
                    )}
                    {req.note && (
                      <p className="mt-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/50 px-2.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 italic">
                        📝 {req.note}
                      </p>
                    )}
                    {req.approver && (
                      <p className="mt-1 text-xs text-slate-400">
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
      )}
    </div>
  );
}
