import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import {
  getDashboardOverview,
  getAbsenceStats,
  getPointsStats,
  getAllUsers,
  getDepartments,
} from "@/actions/admin-queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin panel" };

export default async function AdminPage() {
  const session = await auth();

  // Double-check server-side (middleware also guards this)
  if (session?.user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [overview, absenceStats, pointsStats, users, departments] =
    await Promise.all([
      getDashboardOverview(),
      getAbsenceStats(),
      getPointsStats(),
      getAllUsers(),
      getDepartments(),
    ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/30">
          <ShieldCheck className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Admin panel</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Správa systému KOVO Apka</p>
        </div>
      </div>

      <AdminDashboard
        overview={overview}
        absenceStats={absenceStats}
        pointsStats={pointsStats}
        users={users}
        departments={departments}
      />
    </div>
  );
}
