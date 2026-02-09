import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminLogsClient } from "@/components/admin/admin-logs";
import {
  getAuditLogs,
  getSecurityEvents,
  getAuditLogFilterOptions,
  getSecurityEventFilterOptions,
  getAuditStats,
} from "@/actions/admin-logs";
import { getAllUsers } from "@/actions/admin-queries";
import { ShieldAlert } from "lucide-react";
import type { Role } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin logy" };

export default async function AdminLogsPage() {
  const session = await auth();
  const role = session?.user?.role as Role | undefined;

  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [
    auditData,
    securityData,
    auditFilterOptions,
    securityFilterOptions,
    stats,
    users,
  ] = await Promise.all([
    getAuditLogs({ perPage: 25 }),
    getSecurityEvents({ perPage: 25 }),
    getAuditLogFilterOptions(),
    getSecurityEventFilterOptions(),
    getAuditStats(),
    getAllUsers(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/30">
          <ShieldAlert className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Systémové logy
          </h1>
          <p className="text-sm text-foreground-secondary">
            Audit logy, bezpečnostní události a správa uživatelů
          </p>
        </div>
      </div>

      <AdminLogsClient
        initialAuditData={auditData}
        initialSecurityData={securityData}
        auditFilterOptions={auditFilterOptions}
        securityFilterOptions={securityFilterOptions}
        stats={stats}
        users={users}
      />
    </div>
  );
}
