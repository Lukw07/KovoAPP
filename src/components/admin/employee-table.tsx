"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MagnifyingGlass,
  User,
  Briefcase,
  FirstAid,
  CalendarDots,
  CaretRight,
  Warning,
  CheckCircle,
  Funnel,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import type { EmployeeListItem } from "@/actions/employee-management";

// ============================================================================
// Employee Management Table — responsive: cards on mobile, table on desktop
// ============================================================================

interface EmployeeTableProps {
  employees: EmployeeListItem[];
}

const DEPT_FILTER_ALL = "__ALL__";

export function EmployeeTable({ employees }: EmployeeTableProps) {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState(DEPT_FILTER_ALL);

  const departments = Array.from(
    new Set(employees.map((e) => e.department?.name).filter(Boolean)),
  ).sort() as string[];

  const filtered = employees.filter((e) => {
    const matchesSearch =
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.position?.toLowerCase().includes(search.toLowerCase());
    const matchesDept =
      deptFilter === DEPT_FILTER_ALL || e.department?.name === deptFilter;
    return matchesSearch && matchesDept;
  });

  // Stats
  const totalActive = employees.filter((e) => e.isActive).length;
  const overdueExams = employees.filter(
    (e) => e.nextMedicalExam?.status === "OVERDUE",
  ).length;
  const expiringContracts = employees.filter((e) => {
    if (!e.currentContract?.endDate) return false;
    const diff =
      new Date(e.currentContract.endDate).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // within 30 days
  }).length;

  return (
    <div className="space-y-4">
      {/* ── Summary cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Aktivní zaměstnanci"
          value={totalActive}
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          label="Celkem zaměstnanců"
          value={employees.length}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          label="Prohlídky po termínu"
          value={overdueExams}
          color={
            overdueExams > 0
              ? "text-red-600 dark:text-red-400"
              : "text-emerald-600 dark:text-emerald-400"
          }
          bg={
            overdueExams > 0
              ? "bg-red-50 dark:bg-red-900/20"
              : "bg-emerald-50 dark:bg-emerald-900/20"
          }
        />
        <StatCard
          label="Smlouvy do 30 dnů"
          value={expiringContracts}
          color={
            expiringContracts > 0
              ? "text-amber-600 dark:text-amber-400"
              : "text-emerald-600 dark:text-emerald-400"
          }
          bg={
            expiringContracts > 0
              ? "bg-amber-50 dark:bg-amber-900/20"
              : "bg-emerald-50 dark:bg-emerald-900/20"
          }
        />
      </div>

      {/* ── Filters ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat zaměstnance…"
            className="w-full rounded-lg border border-border bg-background-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-foreground-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <Funnel className="h-4 w-4 text-foreground-muted shrink-0" />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          >
            <option value={DEPT_FILTER_ALL}>Všechna oddělení</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Mobile cards / Desktop table ──────────────────────── */}

      {/* Mobile: card list */}
      <div className="space-y-2 lg:hidden">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          filtered.map((emp) => (
            <EmployeeCard key={emp.id} employee={emp} />
          ))
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden lg:block">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-background-secondary">
                  <th className="px-4 py-3 font-medium text-foreground-secondary">
                    Zaměstnanec
                  </th>
                  <th className="px-4 py-3 font-medium text-foreground-secondary">
                    Oddělení
                  </th>
                  <th className="px-4 py-3 font-medium text-foreground-secondary">
                    Smlouva
                  </th>
                  <th className="px-4 py-3 font-medium text-foreground-secondary">
                    Dovolená
                  </th>
                  <th className="px-4 py-3 font-medium text-foreground-secondary">
                    Sick days
                  </th>
                  <th className="px-4 py-3 font-medium text-foreground-secondary">
                    Prohlídka
                  </th>
                  <th className="px-4 py-3 font-medium text-foreground-secondary" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((emp) => (
                  <EmployeeRow key={emp.id} employee={emp} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border p-4", bg)}>
      <p className="text-xs font-medium text-foreground-secondary">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", color)}>
        {value}
      </p>
    </div>
  );
}

// ── Mobile card ─────────────────────────────────────────────────────────────

function EmployeeCard({ employee: e }: { employee: EmployeeListItem }) {
  const isExamOverdue = e.nextMedicalExam?.status === "OVERDUE";
  const contractExpiring =
    e.currentContract?.endDate &&
    new Date(e.currentContract.endDate).getTime() - Date.now() <
      30 * 24 * 60 * 60 * 1000 &&
    new Date(e.currentContract.endDate).getTime() > Date.now();

  return (
    <Link
      href={`/admin/employees/${e.id}`}
      className="block rounded-xl border border-border bg-card p-4 active:bg-card-hover transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white overflow-hidden">
          {e.avatarUrl ? (
            <img
              src={e.avatarUrl}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            e.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground truncate">
              {e.name}
            </p>
            <CaretRight className="h-4 w-4 text-foreground-muted shrink-0" />
          </div>
          <p className="text-xs text-foreground-secondary truncate">
            {e.position ?? e.currentContract?.position ?? "—"}
          </p>

          {/* Tags */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {e.department && (
              <span
                className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: e.department.color
                    ? `${e.department.color}20`
                    : undefined,
                  color: e.department.color ?? undefined,
                }}
              >
                {e.department.code}
              </span>
            )}
            {e.vacationBalance && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                <CalendarDots className="h-3 w-3" weight="bold" />
                {e.vacationBalance.remaining}d zbývá
              </span>
            )}
            <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
              <FirstAid className="h-3 w-3" weight="bold" />
              {e.sickDaysThisYear} sick
            </span>
            {isExamOverdue && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                <Warning className="h-3 w-3" weight="fill" />
                Prohlídka!
              </span>
            )}
            {contractExpiring && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                <Warning className="h-3 w-3" weight="fill" />
                Smlouva končí
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Desktop table row ───────────────────────────────────────────────────────

function EmployeeRow({ employee: e }: { employee: EmployeeListItem }) {
  const isExamOverdue = e.nextMedicalExam?.status === "OVERDUE";

  return (
    <tr className="hover:bg-background-secondary transition-colors group">
      {/* Employee */}
      <td className="px-4 py-3">
        <Link
          href={`/admin/employees/${e.id}`}
          className="flex items-center gap-3"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white overflow-hidden">
            {e.avatarUrl ? (
              <img
                src={e.avatarUrl}
                alt=""
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              e.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate group-hover:text-accent-text transition-colors">
              {e.name}
            </p>
            <p className="text-xs text-foreground-muted truncate">
              {e.position ?? e.currentContract?.position ?? "—"}
            </p>
          </div>
        </Link>
      </td>

      {/* Department */}
      <td className="px-4 py-3">
        {e.department ? (
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: e.department.color
                ? `${e.department.color}15`
                : undefined,
              color: e.department.color ?? undefined,
            }}
          >
            {e.department.name}
          </span>
        ) : (
          <span className="text-xs text-foreground-muted">—</span>
        )}
      </td>

      {/* Contract */}
      <td className="px-4 py-3">
        {e.currentContract ? (
          <div>
            <span className="text-xs font-medium text-foreground">
              {contractLabel(e.currentContract.type)}
            </span>
            {e.currentContract.endDate && (
              <p className="text-[11px] text-foreground-muted">
                do {format(new Date(e.currentContract.endDate), "d. M. yyyy", { locale: cs })}
              </p>
            )}
            {!e.currentContract.endDate && (
              <p className="text-[11px] text-foreground-muted">
                na dobu neurčitou
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs text-foreground-muted">—</span>
        )}
      </td>

      {/* Vacation */}
      <td className="px-4 py-3">
        {e.vacationBalance ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-[60px]">
              <div className="h-1.5 rounded-full bg-background-tertiary overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{
                    width: `${Math.min(100, (e.vacationBalance.usedDays / e.vacationBalance.totalDays) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <span className="text-xs tabular-nums text-foreground-secondary whitespace-nowrap">
              {e.vacationBalance.remaining}/{e.vacationBalance.totalDays}
            </span>
          </div>
        ) : (
          <span className="text-xs text-foreground-muted">—</span>
        )}
      </td>

      {/* Sick days */}
      <td className="px-4 py-3">
        <span
          className={cn(
            "text-sm font-medium tabular-nums",
            e.sickDaysThisYear > 10
              ? "text-red-600 dark:text-red-400"
              : e.sickDaysThisYear > 5
                ? "text-amber-600 dark:text-amber-400"
                : "text-foreground",
          )}
        >
          {e.sickDaysThisYear}
        </span>
      </td>

      {/* Medical exam */}
      <td className="px-4 py-3">
        {e.nextMedicalExam ? (
          <div className="flex items-center gap-1.5">
            {isExamOverdue ? (
              <Warning
                className="h-4 w-4 text-red-500"
                weight="fill"
              />
            ) : (
              <CheckCircle
                className="h-4 w-4 text-emerald-500"
                weight="fill"
              />
            )}
            <span
              className={cn(
                "text-xs",
                isExamOverdue
                  ? "text-red-600 dark:text-red-400 font-medium"
                  : "text-foreground-secondary",
              )}
            >
              {format(
                new Date(e.nextMedicalExam.scheduledAt),
                "d. M. yyyy",
                { locale: cs },
              )}
            </span>
          </div>
        ) : (
          <span className="text-xs text-foreground-muted">—</span>
        )}
      </td>

      {/* Action */}
      <td className="px-4 py-3">
        <Link
          href={`/admin/employees/${e.id}`}
          className="text-xs font-medium text-accent-text hover:underline"
        >
          Detail
        </Link>
      </td>
    </tr>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <User className="mb-3 h-10 w-10 text-foreground-muted" />
      <p className="text-sm text-foreground-secondary">
        Žádní zaměstnanci nenalezeni
      </p>
    </div>
  );
}

function contractLabel(type: string): string {
  switch (type) {
    case "HPP":
      return "HPP";
    case "DPP":
      return "DPP";
    case "DPC":
      return "DPČ";
    default:
      return type;
  }
}
