"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  Users,
  PenTool,
  Download,
  BarChart3,
  TrendingUp,
  UserCheck,
  AlertCircle,
  Clock,
  Gift,
  ShieldAlert,
  Loader2,
  Briefcase,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AbsenceChart } from "@/components/admin/absence-chart";
import { PointsChart } from "@/components/admin/points-chart";
import { UserManagementTable } from "@/components/admin/user-management-table";
import { CsvExport } from "@/components/admin/csv-export";
import { AdminPanel } from "@/components/admin/admin-panel";
import { RewardClaimsManager } from "@/components/admin/reward-claims-manager";
import { PointsManager } from "@/components/admin/points-manager";
import { AdminLogsClient } from "@/components/admin/admin-logs";
import { EmployeeTable } from "@/components/admin/employee-table";
import {
  getAuditLogs,
  getSecurityEvents,
  getAuditLogFilterOptions,
  getSecurityEventFilterOptions,
  getAuditStats,
} from "@/actions/admin-logs";
import { getAllUsers as fetchAllUsers } from "@/actions/admin-queries";
import { getEmployeeList } from "@/actions/employee-management";
import type { Role } from "@/generated/prisma/enums";

type AdminSection = "dashboard" | "users" | "employees" | "create" | "points" | "rewards" | "export" | "logs";

interface OverviewStats {
  totalUsers: number;
  activeUsers: number;
  pendingRequests: number;
  todayAbsent: number;
}

interface AbsenceStat {
  type: string;
  label: string;
  count: number;
  days: number;
}

interface PointsStatsData {
  totalPoints: number;
  totalTransactions: number;
  categoryData: { category: string; points: number }[];
  dailyData: { date: string; points: number }[];
}

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  position: string | null;
  phone: string | null;
  isActive: boolean;
  hireDate: Date;
  pointsBalance: number;
  department: { name: string; code: string } | null;
};

type Department = { id: string; name: string; code: string };

type RewardClaimRow = {
  id: string;
  status: string;
  createdAt: Date;
  reward: { name: string; pointsCost: number; imageUrl: string | null };
  user: { id: string; name: string; email: string; avatarUrl: string | null };
};

interface AdminDashboardProps {
  overview: OverviewStats;
  absenceStats: AbsenceStat[];
  pointsStats: PointsStatsData;
  users: UserRow[];
  departments: Department[];
  rewardClaims: RewardClaimRow[];
  userRole: Role;
}

// Section definitions with role visibility
const ALL_SECTIONS: {
  key: AdminSection;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
}[] = [
  {
    key: "dashboard",
    label: "Přehled",
    icon: <LayoutDashboard className="h-4 w-4" />,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    key: "users",
    label: "Uživatelé",
    icon: <Users className="h-4 w-4" />,
    roles: ["ADMIN"],
  },
  {
    key: "employees",
    label: "Zaměstnanci",
    icon: <Briefcase className="h-4 w-4" />,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    key: "create",
    label: "Vytvořit",
    icon: <PenTool className="h-4 w-4" />,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    key: "points",
    label: "Body",
    icon: <Star className="h-4 w-4" />,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    key: "rewards",
    label: "Odměny",
    icon: <Gift className="h-4 w-4" />,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    key: "export",
    label: "Export",
    icon: <Download className="h-4 w-4" />,
    roles: ["ADMIN"],
  },
  {
    key: "logs",
    label: "Logy",
    icon: <ShieldAlert className="h-4 w-4" />,
    roles: ["ADMIN"],
  },
];

export function AdminDashboard({
  overview,
  absenceStats,
  pointsStats,
  users,
  departments,
  rewardClaims,
  userRole,
}: AdminDashboardProps) {
  // Filter sections by role
  const visibleSections = ALL_SECTIONS.filter((s) =>
    s.roles.includes(userRole),
  );

  const [section, setSection] = useState<AdminSection>(
    visibleSections[0]?.key ?? "dashboard",
  );

  const now = new Date();
  const monthName = now.toLocaleDateString("cs-CZ", { month: "long" });

  return (
    <div className="space-y-6">
      {/* Section nav */}
      <div className="flex gap-2 overflow-x-auto">
        {visibleSections.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all active:scale-95",
              section === s.key
                ? "bg-red-600 text-white shadow-sm"
                : "bg-card border border-border text-foreground-secondary hover:bg-card-hover"
            )}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* ─── Dashboard Overview ──────────────────────────────────────── */}
      {section === "dashboard" && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={<Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
              label="Celkem uživatelů"
              value={overview.totalUsers}
              sub={`${overview.activeUsers} aktivních`}
              bgColor="bg-blue-50 dark:bg-blue-900/30"
            />
            <StatCard
              icon={<AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
              label="Čekající žádosti"
              value={overview.pendingRequests}
              sub="ke schválení"
              bgColor="bg-amber-50 dark:bg-amber-900/30"
            />
            <StatCard
              icon={<UserCheck className="h-5 w-5 text-red-600 dark:text-red-400" />}
              label="Dnes nepřítomni"
              value={overview.todayAbsent}
              sub="bez home office"
              bgColor="bg-red-50 dark:bg-red-900/30"
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />}
              label="Body tento měsíc"
              value={pointsStats.totalPoints}
              sub={`${pointsStats.totalTransactions} transakcí`}
              bgColor="bg-green-50 dark:bg-green-900/30"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-accent" />
                <h3 className="font-semibold text-foreground">
                  Absence – {monthName}
                </h3>
              </div>
              <AbsenceChart data={absenceStats} />
              {/* Legend */}
              <div className="mt-3 flex flex-wrap gap-3">
                {absenceStats.map((stat) => (
                  <div
                    key={stat.type}
                    className="flex items-center gap-1.5 text-xs text-foreground-secondary"
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: ABSENCE_COLORS[stat.type] ?? "#94a3b8",
                      }}
                    />
                    {stat.label}: {stat.count}× ({stat.days} dnů)
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-foreground">
                  Body – {monthName}
                </h3>
              </div>
              <PointsChart data={pointsStats} />
            </div>
          </div>
        </div>
      )}

      {/* ─── Users ───────────────────────────────────────────────────── */}
      {section === "users" && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            <h3 className="font-semibold text-foreground">
              Správa uživatelů
            </h3>
          </div>
          <UserManagementTable users={users} departments={departments} />
        </div>
      )}

      {/* ─── Create (existing AdminPanel) ────────────────────────────── */}
      {section === "create" && <AdminPanel />}

      {/* ─── Points Manager ──────────────────────────────────────────── */}
      {section === "points" && <PointsManager />}

      {/* ─── Employees (lazy-loaded) ──────────────────────────────────── */}
      {section === "employees" && <LazyEmployees />}

      {/* ─── Reward Claims ───────────────────────────────────────────── */}
      {section === "rewards" && (
        <div className="rounded-xl border border-border bg-card p-4">
          <RewardClaimsManager claims={rewardClaims} />
        </div>
      )}

      {/* ─── Export ───────────────────────────────────────────────────────────── */}
      {section === "export" && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-foreground">
              Export dat pro Helios
            </h3>
          </div>
          <p className="text-sm text-foreground-secondary">
            Exportuje schválené dovolené za vybraný měsíc do CSV souboru
            kompatibilního s Helios. Soubor používá středníky jako oddělovač a
            UTF-8 kódování.
          </p>
          <CsvExport />
        </div>
      )}

      {/* ─── Logs (inline, lazy-loaded) ─────────────────────────────────────── */}
      {section === "logs" && <LazyAdminLogs />}
    </div>
  );
}

// ─── Lazy-loaded Employees ──────────────────────────────────────────────────

function LazyEmployees() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [employees, setEmployees] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEmployeeList();
      setEmployees(data);
    } catch {
      setError("Nepodařilo se načíst zaměstnance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
        <p className="mt-3 text-sm text-foreground-secondary">Načítání zaměstnanců…</p>
      </div>
    );
  }

  if (error || !employees) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 space-y-3">
        <Briefcase className="h-8 w-8 text-red-500" />
        <p className="text-sm text-foreground-secondary">{error}</p>
        <button
          onClick={loadData}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          Zkusit znovu
        </button>
      </div>
    );
  }

  return <EmployeeTable employees={employees} />;
}

// ─── Lazy-loaded Admin Logs ─────────────────────────────────────────────────

function LazyAdminLogs() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [auditData, securityData, auditFilterOptions, securityFilterOptions, stats, users] =
        await Promise.all([
          getAuditLogs({ perPage: 25 }),
          getSecurityEvents({ perPage: 25 }),
          getAuditLogFilterOptions(),
          getSecurityEventFilterOptions(),
          getAuditStats(),
          fetchAllUsers(),
        ]);
      setData({ auditData, securityData, auditFilterOptions, securityFilterOptions, stats, users });
    } catch {
      setError("Nepodařilo se načíst logy");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
        <p className="mt-3 text-sm text-foreground-secondary">Načítání logů…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 space-y-3">
        <ShieldAlert className="h-8 w-8 text-red-500" />
        <p className="text-sm text-foreground-secondary">{error}</p>
        <button
          onClick={loadData}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          Zkusit znovu
        </button>
      </div>
    );
  }

  return (
    <AdminLogsClient
      initialAuditData={data.auditData}
      initialSecurityData={data.securityData}
      auditFilterOptions={data.auditFilterOptions}
      securityFilterOptions={data.securityFilterOptions}
      stats={data.stats}
      users={data.users}
    />
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  bgColor: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            bgColor
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs font-medium text-foreground-secondary">{label}</p>
          <p className="text-xs text-foreground-muted">{sub}</p>
        </div>
      </div>
    </div>
  );
}

const ABSENCE_COLORS: Record<string, string> = {
  VACATION: "#3b82f6",
  SICK_DAY: "#ef4444",
  DOCTOR: "#f59e0b",
  PERSONAL_DAY: "#8b5cf6",
  HOME_OFFICE: "#10b981",
};
