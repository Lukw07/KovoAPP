import { getMyRequests, getPendingForManager, getRequestsForCalendar } from "@/actions/hr-queries";
import { auth } from "@/lib/auth";
import {
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PendingApprovals } from "@/components/hr/pending-approvals";
import { RequestsClient } from "@/components/hr/requests-client";

export const metadata = { title: "Moje žádosti" };

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/requests");
  }

  const role = session?.user?.role;
  const isManagement = role === "ADMIN" || role === "MANAGER";

  const now = new Date();
  const calendarYear = now.getFullYear();
  const calendarMonth = now.getMonth() + 1;

  const [{ items, total }, pendingRequests, calendarRequests] =
    await Promise.all([
      getMyRequests().catch(() => ({ items: [], total: 0 })),
      isManagement ? getPendingForManager().catch(() => []) : Promise.resolve([]),
      getRequestsForCalendar(calendarYear, calendarMonth).catch(() => []),
    ]);

  return (
    <div className="space-y-6">
      {/* ── Manager/Admin: Pending approvals section ─────────────────── */}
      {isManagement && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-lg font-bold text-foreground">
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
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
            Moje žádosti
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Moje žádosti</h1>
        <Link
          href="/requests/new"
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 active:scale-[0.97] transition-transform hover:bg-blue-700"
        >
          + Nová žádost
        </Link>
      </div>

      {/* ── Tabbed content: Seznam / Kalendář ───────────────────────── */}
      <RequestsClient
        items={JSON.parse(JSON.stringify(items))}
        total={total}
        calendarRequests={JSON.parse(JSON.stringify(calendarRequests))}
        calendarYear={calendarYear}
        calendarMonth={calendarMonth}
      />
    </div>
  );
}
