import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ShieldCheck, Briefcase } from "lucide-react";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import {
  getDashboardOverview,
  getAbsenceStats,
  getPointsStats,
  getAllUsers,
  getDepartments,
} from "@/actions/admin-queries";
import { getAllRewardClaims } from "@/actions/admin-rewards";
import type { Role } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";
export const metadata = { title: "Správa" };

export default async function AdminPage() {
  const session = await auth();
  const role = session?.user?.role as Role | undefined;

  // Only ADMIN and MANAGER can access
  if (role !== "ADMIN" && role !== "MANAGER") {
    redirect("/dashboard");
  }

  const isAdmin = role === "ADMIN";

  // Fetch common data for both roles
  const [overview, absenceStats, pointsStats, rewardClaims] =
    await Promise.all([
      getDashboardOverview(),
      getAbsenceStats(),
      getPointsStats(),
      getAllRewardClaims(),
    ]);

  // Admin-only data: users + departments (for user management & export)
  let users: Awaited<ReturnType<typeof getAllUsers>> = [];
  let departments: Awaited<ReturnType<typeof getDepartments>> = [];

  if (isAdmin) {
    [users, departments] = await Promise.all([
      getAllUsers(),
      getDepartments(),
    ]);
  }

  const isManagerOnly = role === "MANAGER";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isManagerOnly ? "bg-blue-50 dark:bg-blue-900/30" : "bg-red-50 dark:bg-red-900/30"}`}>
          {isManagerOnly ? (
            <Briefcase className="h-5 w-5 text-blue-600" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-red-600" />
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {isManagerOnly ? "Správa" : "Admin panel"}
          </h1>
          <p className="text-sm text-foreground-secondary">
            {isManagerOnly
              ? "Schvalování, tvorba obsahu a přehledy"
              : "Správa systému KOVO Apka"}
          </p>
        </div>
      </div>

      <AdminDashboard
        overview={overview}
        absenceStats={absenceStats}
        pointsStats={pointsStats}
        users={users}
        departments={departments}
        rewardClaims={rewardClaims}
        userRole={role}
      />
    </div>
  );
}
