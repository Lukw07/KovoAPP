"use client";

import { useState, useTransition, useCallback } from "react";
import {
  Search,
  Filter,
  FileText,
  Shield,
  BarChart3,
  Trash2,
  UserX,
  Download,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  AlertCircle,
  Info,
  Eye,
  X,
  RefreshCw,
  Users,
  Activity,
  ShieldAlert,
  ChevronDown,
  UserMinus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  getAuditLogs,
  getSecurityEvents,
  clearOldAuditLogs,
  clearOldSecurityEvents,
  exportAuditLogs,
  type AuditLogFilters,
  type SecurityEventFilters,
} from "@/actions/admin-logs";
import { deleteUser, toggleUserActive } from "@/actions/admin-users";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "overview" | "audit" | "security" | "users";

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
  performedBy: string;
  performer: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
};

type SecurityEvent = {
  id: string;
  type: string;
  severity: string;
  ipAddress: string | null;
  userAgent: string | null;
  userId: string | null;
  email: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
  user: { id: string; name: string; email: string } | null;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  position: string | null;
  isActive: boolean;
  hireDate: Date;
  pointsBalance: number;
  department: { name: string; code: string } | null;
};

interface PaginatedAuditData {
  logs: AuditLog[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

interface PaginatedSecurityData {
  events: SecurityEvent[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

interface Stats {
  totalAuditLogs: number;
  todayAuditLogs: number;
  weekAuditLogs: number;
  totalSecurityEvents: number;
  criticalEvents: number;
  warningEvents: number;
  todaySecurityEvents: number;
  recentFailedLogins: number;
}

interface FilterOptions {
  actions: string[];
  entityTypes: string[];
  performers: { id: string; name: string }[];
}

interface SecurityFilterOptions {
  types: string[];
  severities: string[];
}

interface AdminLogsClientProps {
  initialAuditData: PaginatedAuditData;
  initialSecurityData: PaginatedSecurityData;
  auditFilterOptions: FilterOptions;
  securityFilterOptions: SecurityFilterOptions;
  stats: Stats;
  users: UserRow[];
}

// ─── Action Label Maps ───────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  USER_CREATED: "Uživatel vytvořen",
  USER_UPDATED: "Uživatel upraven",
  USER_DELETED: "Uživatel smazán",
  USER_ACTIVATED: "Uživatel aktivován",
  USER_DEACTIVATED: "Uživatel deaktivován",
  PASSWORD_RESET: "Reset hesla",
  HR_REQUEST_APPROVED: "Žádost schválena",
  HR_REQUEST_REJECTED: "Žádost zamítnuta",
  POINTS_AWARDED: "Body uděleny",
  POINTS_DEDUCTED: "Body odečteny",
  POST_CREATED: "Příspěvek vytvořen",
  POST_UPDATED: "Příspěvek upraven",
  POST_DELETED: "Příspěvek smazán",
  POLL_CREATED: "Anketa vytvořena",
  POLL_CLOSED: "Anketa uzavřena",
  JOB_CREATED: "Inzerát vytvořen",
  JOB_UPDATED: "Inzerát upraven",
  REWARD_CLAIMED: "Odměna vyžádána",
  REWARD_FULFILLED: "Odměna splněna",
  REWARD_CANCELLED: "Odměna zrušena",
  RESERVATION_CREATED: "Rezervace vytvořena",
  RESERVATION_CANCELLED: "Rezervace zrušena",
  AUDIT_LOGS_CLEARED: "Logy vyčištěny",
  SECURITY_EVENTS_CLEARED: "Bezp. události vyčištěny",
  LISTING_DELETED: "Inzerát smazán",
};

const SECURITY_TYPE_LABELS: Record<string, string> = {
  LOGIN_FAILED: "Neúspěšné přihlášení",
  LOGIN_SUCCESS: "Úspěšné přihlášení",
  ACCOUNT_LOCKED: "Účet uzamčen",
  SUSPICIOUS_INPUT: "Podezřelý vstup",
  BRUTE_FORCE: "Brute-force útok",
  RATE_LIMIT: "Rate limit",
  INVALID_TOKEN: "Neplatný token",
};

const SEVERITY_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  CRITICAL: {
    color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  WARNING: {
    color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  INFO: {
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    icon: <Info className="h-3.5 w-3.5" />,
  },
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Zaměstnanec",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  MANAGER: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  EMPLOYEE: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
};

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdminLogsClient({
  initialAuditData,
  initialSecurityData,
  auditFilterOptions,
  securityFilterOptions,
  stats,
  users,
}: AdminLogsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("overview");

  // Audit state
  const [auditData, setAuditData] = useState(initialAuditData);
  const [auditFilters, setAuditFilters] = useState<AuditLogFilters>({});
  const [showAuditFilters, setShowAuditFilters] = useState(false);

  // Security state
  const [securityData, setSecurityData] = useState(initialSecurityData);
  const [securityFilters, setSecurityFilters] = useState<SecurityEventFilters>({});
  const [showSecurityFilters, setShowSecurityFilters] = useState(false);

  // User management state
  const [userSearch, setUserSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<UserRow | null>(null);
  const [deleteEmail, setDeleteEmail] = useState("");

  // Detail view state
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);
  const [detailEvent, setDetailEvent] = useState<SecurityEvent | null>(null);

  // Messages
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Cleanup dialog
  const [showCleanup, setShowCleanup] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(90);

  // ─── Fetch Helpers ────────────────────────────────────────────

  const fetchAuditLogs = useCallback(
    (filters: AuditLogFilters) => {
      startTransition(async () => {
        const data = await getAuditLogs(filters);
        setAuditData(data);
      });
    },
    [],
  );

  const fetchSecurityEvents = useCallback(
    (filters: SecurityEventFilters) => {
      startTransition(async () => {
        const data = await getSecurityEvents(filters);
        setSecurityData(data);
      });
    },
    [],
  );

  // ─── Audit filter handlers ────────────────────────────────────

  const applyAuditFilter = (newFilters: Partial<AuditLogFilters>) => {
    const merged = { ...auditFilters, ...newFilters, page: 1 };
    setAuditFilters(merged);
    fetchAuditLogs(merged);
  };

  const clearAuditFilters = () => {
    setAuditFilters({});
    fetchAuditLogs({});
  };

  const auditPageChange = (page: number) => {
    const merged = { ...auditFilters, page };
    setAuditFilters(merged);
    fetchAuditLogs(merged);
  };

  // ─── Security filter handlers ─────────────────────────────────

  const applySecurityFilter = (newFilters: Partial<SecurityEventFilters>) => {
    const merged = { ...securityFilters, ...newFilters, page: 1 };
    setSecurityFilters(merged);
    fetchSecurityEvents(merged);
  };

  const clearSecurityFilters = () => {
    setSecurityFilters({});
    fetchSecurityEvents({});
  };

  const securityPageChange = (page: number) => {
    const merged = { ...securityFilters, page };
    setSecurityFilters(merged);
    fetchSecurityEvents(merged);
  };

  // ─── User actions ─────────────────────────────────────────────

  const handleDeleteUser = () => {
    if (!deleteConfirm) return;
    const fd = new FormData();
    fd.set("userId", deleteConfirm.id);
    fd.set("confirmEmail", deleteEmail);

    startTransition(async () => {
      const result = await deleteUser(fd);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({
          type: "success",
          text: `Uživatel ${result.deletedName} byl smazán`,
        });
        setDeleteConfirm(null);
        setDeleteEmail("");
        router.refresh();
      }
    });
  };

  const handleToggleActive = (userId: string, isActive: boolean) => {
    startTransition(async () => {
      const result = await toggleUserActive(userId, isActive);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({
          type: "success",
          text: isActive ? "Uživatel aktivován" : "Uživatel deaktivován",
        });
        router.refresh();
      }
    });
  };

  // ─── Cleanup handlers ─────────────────────────────────────────

  const handleCleanupAudit = () => {
    startTransition(async () => {
      const result = await clearOldAuditLogs(cleanupDays);
      if (result.success) {
        setMessage({
          type: "success",
          text: `Smazáno ${result.deletedCount} starých záznamů`,
        });
        setShowCleanup(false);
        router.refresh();
      }
    });
  };

  const handleCleanupSecurity = () => {
    startTransition(async () => {
      const result = await clearOldSecurityEvents(cleanupDays);
      if (result.success) {
        setMessage({
          type: "success",
          text: `Smazáno ${result.deletedCount} starých bezp. událostí`,
        });
        setShowCleanup(false);
        router.refresh();
      }
    });
  };

  // ─── Export handler ────────────────────────────────────────────

  const handleExport = () => {
    startTransition(async () => {
      const data = await exportAuditLogs(auditFilters);
      // Build CSV
      if (data.length === 0) {
        setMessage({ type: "error", text: "Žádné záznamy k exportu" });
        return;
      }
      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(";"),
        ...data.map((row) =>
          headers.map((h) => `"${String((row as Record<string, unknown>)[h] ?? "")}"`).join(";"),
        ),
      ].join("\n");
      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logy-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // ─── Tab definitions ───────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Přehled", icon: <BarChart3 className="h-4 w-4" /> },
    { key: "audit", label: "Audit logy", icon: <FileText className="h-4 w-4" /> },
    { key: "security", label: "Bezpečnost", icon: <Shield className="h-4 w-4" /> },
    { key: "users", label: "Správa uživatelů", icon: <Users className="h-4 w-4" /> },
  ];

  // Filtered users for user management tab
  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.department?.name.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-4">
      {/* Message toast */}
      {message && (
        <div
          className={cn(
            "flex items-center justify-between rounded-xl border px-4 py-3 text-sm",
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400",
          )}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all active:scale-95",
              tab === t.key
                ? "bg-red-600 text-white shadow-sm"
                : "bg-card border border-border text-foreground-secondary hover:bg-card-hover",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW TAB ═══════════════════════════════════════════ */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={<FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
              label="Celkem audit logů"
              value={stats.totalAuditLogs}
              sub={`${stats.todayAuditLogs} dnes`}
              bgColor="bg-blue-50 dark:bg-blue-900/30"
            />
            <StatCard
              icon={<Activity className="h-5 w-5 text-green-600 dark:text-green-400" />}
              label="Za posledních 7 dní"
              value={stats.weekAuditLogs}
              sub="audit záznamů"
              bgColor="bg-green-50 dark:bg-green-900/30"
            />
            <StatCard
              icon={<ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />}
              label="Kritické události"
              value={stats.criticalEvents}
              sub={`${stats.warningEvents} varování (30d)`}
              bgColor="bg-red-50 dark:bg-red-900/30"
            />
            <StatCard
              icon={<AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
              label="Neúspěšná přihlášení"
              value={stats.recentFailedLogins}
              sub="za posledních 7 dní"
              bgColor="bg-amber-50 dark:bg-amber-900/30"
            />
          </div>

          {/* Quick sections */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recent audit logs */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-accent" />
                  <h3 className="font-semibold text-foreground">Poslední akce</h3>
                </div>
                <button
                  onClick={() => setTab("audit")}
                  className="text-xs text-accent hover:underline"
                >
                  Zobrazit vše →
                </button>
              </div>
              <div className="space-y-2">
                {initialAuditData.logs.slice(0, 8).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-lg bg-background p-2.5 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-foreground">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                      <span className="ml-2 text-foreground-secondary">
                        — {log.performer.name}
                      </span>
                    </div>
                    <span className="ml-2 shrink-0 text-xs text-foreground-muted">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent security events */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-foreground">
                    Bezpečnostní události
                  </h3>
                </div>
                <button
                  onClick={() => setTab("security")}
                  className="text-xs text-accent hover:underline"
                >
                  Zobrazit vše →
                </button>
              </div>
              <div className="space-y-2">
                {initialSecurityData.events.slice(0, 8).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-lg bg-background p-2.5 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                          SEVERITY_CONFIG[event.severity]?.color ?? "bg-gray-100 text-gray-700",
                        )}
                      >
                        {SEVERITY_CONFIG[event.severity]?.icon}
                        {event.severity}
                      </span>
                      <span className="truncate font-medium text-foreground">
                        {SECURITY_TYPE_LABELS[event.type] ?? event.type}
                      </span>
                    </div>
                    <span className="ml-2 shrink-0 text-xs text-foreground-muted">
                      {formatDate(event.createdAt)}
                    </span>
                  </div>
                ))}
                {initialSecurityData.events.length === 0 && (
                  <p className="py-4 text-center text-sm text-foreground-muted">
                    Žádné bezpečnostní události
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Cleanup section */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-foreground-secondary" />
                <h3 className="font-semibold text-foreground">Údržba logů</h3>
              </div>
              <button
                onClick={() => setShowCleanup(!showCleanup)}
                className="flex items-center gap-1 text-sm text-accent hover:underline"
              >
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", showCleanup && "rotate-180")}
                />
                Nastavení
              </button>
            </div>
            {showCleanup && (
              <div className="mt-4 space-y-4 border-t border-border pt-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm text-foreground-secondary">
                    Ponechat záznamy za posledních:
                  </label>
                  <select
                    value={cleanupDays}
                    onChange={(e) => setCleanupDays(Number(e.target.value))}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                  >
                    <option value={30}>30 dní</option>
                    <option value={60}>60 dní</option>
                    <option value={90}>90 dní</option>
                    <option value={180}>180 dní</option>
                    <option value={365}>365 dní</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCleanupAudit}
                    disabled={isPending}
                    className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    <Trash2 className="mr-1.5 inline h-4 w-4" />
                    Vyčistit audit logy
                  </button>
                  <button
                    onClick={handleCleanupSecurity}
                    disabled={isPending}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="mr-1.5 inline h-4 w-4" />
                    Vyčistit bezp. události
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ AUDIT LOGS TAB ═══════════════════════════════════════ */}
      {tab === "audit" && (
        <div className="space-y-4">
          {/* Search + filters */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
                <input
                  type="text"
                  placeholder="Hledat v logách..."
                  value={auditFilters.search ?? ""}
                  onChange={(e) => applyAuditFilter({ search: e.target.value || undefined })}
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-accent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAuditFilters(!showAuditFilters)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                    showAuditFilters
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-background text-foreground-secondary hover:bg-card-hover",
                  )}
                >
                  <Filter className="h-4 w-4" />
                  Filtry
                </button>
                <button
                  onClick={handleExport}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground-secondary hover:bg-card-hover disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
                <button
                  onClick={() => fetchAuditLogs(auditFilters)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground-secondary hover:bg-card-hover disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
                </button>
              </div>
            </div>

            {/* Advanced filters */}
            {showAuditFilters && (
              <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                    Akce
                  </label>
                  <select
                    value={auditFilters.action ?? ""}
                    onChange={(e) => applyAuditFilter({ action: e.target.value || undefined })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Všechny</option>
                    {auditFilterOptions.actions.map((a) => (
                      <option key={a} value={a}>
                        {ACTION_LABELS[a] ?? a}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                    Typ entity
                  </label>
                  <select
                    value={auditFilters.entityType ?? ""}
                    onChange={(e) => applyAuditFilter({ entityType: e.target.value || undefined })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Všechny</option>
                    {auditFilterOptions.entityTypes.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                    Provedl
                  </label>
                  <select
                    value={auditFilters.performedBy ?? ""}
                    onChange={(e) => applyAuditFilter({ performedBy: e.target.value || undefined })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Všichni</option>
                    {auditFilterOptions.performers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                      Od
                    </label>
                    <input
                      type="date"
                      value={auditFilters.dateFrom ?? ""}
                      onChange={(e) => applyAuditFilter({ dateFrom: e.target.value || undefined })}
                      className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                      Do
                    </label>
                    <input
                      type="date"
                      value={auditFilters.dateTo ?? ""}
                      onChange={(e) => applyAuditFilter({ dateTo: e.target.value || undefined })}
                      className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <button
                    onClick={clearAuditFilters}
                    className="text-sm text-accent hover:underline"
                  >
                    Vymazat všechny filtry
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between text-sm text-foreground-secondary">
            <span>
              Zobrazeno {auditData.logs.length} z {auditData.total} záznamů
            </span>
            <span>
              Stránka {auditData.page} / {auditData.totalPages || 1}
            </span>
          </div>

          {/* Audit log table/list */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th className="px-4 py-3 text-left font-medium text-foreground-secondary">
                      Čas
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-secondary">
                      Akce
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-secondary">
                      Typ
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-secondary">
                      Provedl
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-secondary">
                      IP
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-foreground-secondary">
                      Detail
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {auditData.logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border last:border-0 hover:bg-background/50"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-foreground-muted">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground-secondary">
                        {log.entityType}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {log.performer.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground-muted">
                        {log.ipAddress ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDetailLog(log)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-accent hover:bg-accent/10"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                  {auditData.logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-foreground-muted">
                        Žádné záznamy
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-border">
              {auditData.logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 space-y-2"
                  onClick={() => setDetailLog(log)}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                    <span className="text-xs text-foreground-muted">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{log.performer.name}</span>
                    <span className="text-foreground-secondary">{log.entityType}</span>
                  </div>
                </div>
              ))}
              {auditData.logs.length === 0 && (
                <p className="px-4 py-8 text-center text-foreground-muted text-sm">
                  Žádné záznamy
                </p>
              )}
            </div>
          </div>

          {/* Pagination */}
          {auditData.totalPages > 1 && (
            <Pagination
              page={auditData.page}
              totalPages={auditData.totalPages}
              onPageChange={auditPageChange}
              isPending={isPending}
            />
          )}
        </div>
      )}

      {/* ═══ SECURITY EVENTS TAB ═══════════════════════════════════ */}
      {tab === "security" && (
        <div className="space-y-4">
          {/* Search + filters */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
                <input
                  type="text"
                  placeholder="Hledat v bezpečnostních událostech..."
                  value={securityFilters.search ?? ""}
                  onChange={(e) =>
                    applySecurityFilter({ search: e.target.value || undefined })
                  }
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-accent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSecurityFilters(!showSecurityFilters)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                    showSecurityFilters
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-background text-foreground-secondary hover:bg-card-hover",
                  )}
                >
                  <Filter className="h-4 w-4" />
                  Filtry
                </button>
                <button
                  onClick={() => fetchSecurityEvents(securityFilters)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground-secondary hover:bg-card-hover disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
                </button>
              </div>
            </div>

            {showSecurityFilters && (
              <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                    Typ události
                  </label>
                  <select
                    value={securityFilters.type ?? ""}
                    onChange={(e) =>
                      applySecurityFilter({ type: e.target.value || undefined })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Všechny</option>
                    {securityFilterOptions.types.map((t) => (
                      <option key={t} value={t}>
                        {SECURITY_TYPE_LABELS[t] ?? t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                    Závažnost
                  </label>
                  <select
                    value={securityFilters.severity ?? ""}
                    onChange={(e) =>
                      applySecurityFilter({ severity: e.target.value || undefined })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Všechny</option>
                    {securityFilterOptions.severities.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                      Od
                    </label>
                    <input
                      type="date"
                      value={securityFilters.dateFrom ?? ""}
                      onChange={(e) =>
                        applySecurityFilter({ dateFrom: e.target.value || undefined })
                      }
                      className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                      Do
                    </label>
                    <input
                      type="date"
                      value={securityFilters.dateTo ?? ""}
                      onChange={(e) =>
                        applySecurityFilter({ dateTo: e.target.value || undefined })
                      }
                      className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={clearSecurityFilters}
                    className="text-sm text-accent hover:underline"
                  >
                    Vymazat filtry
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between text-sm text-foreground-secondary">
            <span>
              Zobrazeno {securityData.events.length} z {securityData.total} událostí
            </span>
            <span>
              Stránka {securityData.page} / {securityData.totalPages || 1}
            </span>
          </div>

          {/* Security events list */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th className="px-4 py-3 text-left font-medium text-foreground-secondary">
                      Čas
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-secondary">
                      Závažnost
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-secondary">
                      Typ
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-secondary">
                      Uživatel / Email
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-secondary">
                      IP
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-foreground-secondary">
                      Detail
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {securityData.events.map((event) => (
                    <tr
                      key={event.id}
                      className="border-b border-border last:border-0 hover:bg-background/50"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-foreground-muted">
                        {formatDateTime(event.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                            SEVERITY_CONFIG[event.severity]?.color ??
                              "bg-gray-100 text-gray-700",
                          )}
                        >
                          {SEVERITY_CONFIG[event.severity]?.icon}
                          {event.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {SECURITY_TYPE_LABELS[event.type] ?? event.type}
                      </td>
                      <td className="px-4 py-3 text-foreground-secondary">
                        {event.user?.name ?? event.email ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground-muted">
                        {event.ipAddress ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDetailEvent(event)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-accent hover:bg-accent/10"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                  {securityData.events.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-foreground-muted">
                        Žádné události
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-border">
              {securityData.events.map((event) => (
                <div
                  key={event.id}
                  className="p-4 space-y-2"
                  onClick={() => setDetailEvent(event)}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        SEVERITY_CONFIG[event.severity]?.color ??
                          "bg-gray-100 text-gray-700",
                      )}
                    >
                      {SEVERITY_CONFIG[event.severity]?.icon}
                      {event.severity}
                    </span>
                    <span className="text-xs text-foreground-muted">
                      {formatDateTime(event.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">
                      {SECURITY_TYPE_LABELS[event.type] ?? event.type}
                    </span>
                    <span className="text-foreground-secondary">
                      {event.user?.name ?? event.email ?? "—"}
                    </span>
                  </div>
                  {event.ipAddress && (
                    <p className="font-mono text-xs text-foreground-muted">
                      IP: {event.ipAddress}
                    </p>
                  )}
                </div>
              ))}
              {securityData.events.length === 0 && (
                <p className="px-4 py-8 text-center text-foreground-muted text-sm">
                  Žádné události
                </p>
              )}
            </div>
          </div>

          {/* Pagination */}
          {securityData.totalPages > 1 && (
            <Pagination
              page={securityData.page}
              totalPages={securityData.totalPages}
              onPageChange={securityPageChange}
              isPending={isPending}
            />
          )}
        </div>
      )}

      {/* ═══ USERS TAB - DELETE / DEACTIVATE ═══════════════════════ */}
      {tab === "users" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                placeholder="Vyhledat uživatele..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Users list */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th className="px-4 py-3 text-left font-medium text-foreground-secondary">
                      Jméno
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-secondary">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-secondary">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-secondary">
                      Oddělení
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-secondary">
                      Stav
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-foreground-secondary">
                      Akce
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border last:border-0 hover:bg-background/50"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {user.name}
                      </td>
                      <td className="px-4 py-3 text-foreground-secondary">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-700",
                          )}
                        >
                          {ROLE_LABELS[user.role] ?? user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground-secondary">
                        {user.department?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            user.isActive
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400",
                          )}
                        >
                          {user.isActive ? "Aktivní" : "Neaktivní"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() =>
                              handleToggleActive(user.id, !user.isActive)
                            }
                            disabled={isPending}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium disabled:opacity-50",
                              user.isActive
                                ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                : "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20",
                            )}
                            title={
                              user.isActive ? "Deaktivovat" : "Aktivovat"
                            }
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                            {user.isActive ? "Deaktivovat" : "Aktivovat"}
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirm(user);
                              setDeleteEmail("");
                            }}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                            title="Smazat uživatele"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Smazat
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-foreground-muted">
                        Žádní uživatelé
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile user cards */}
            <div className="lg:hidden divide-y divide-border">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-foreground-secondary">{user.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-700",
                        )}
                      >
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          user.isActive
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400",
                        )}
                      >
                        {user.isActive ? "Aktivní" : "Neaktivní"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(user.id, !user.isActive)}
                      disabled={isPending}
                      className={cn(
                        "flex-1 rounded-xl py-2 text-xs font-medium disabled:opacity-50",
                        user.isActive
                          ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600"
                          : "bg-green-50 dark:bg-green-900/20 text-green-600",
                      )}
                    >
                      {user.isActive ? "Deaktivovat" : "Aktivovat"}
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirm(user);
                        setDeleteEmail("");
                      }}
                      disabled={isPending}
                      className="flex-1 rounded-xl bg-red-50 dark:bg-red-900/20 py-2 text-xs font-medium text-red-600 disabled:opacity-50"
                    >
                      Smazat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ DETAIL MODAL — Audit Log ═══════════════════════════════ */}
      {detailLog && (
        <Modal onClose={() => setDetailLog(null)} title="Detail audit logu">
          <div className="space-y-4">
            <DetailRow label="ID" value={detailLog.id} mono />
            <DetailRow
              label="Akce"
              value={ACTION_LABELS[detailLog.action] ?? detailLog.action}
            />
            <DetailRow label="Typ entity" value={detailLog.entityType} />
            <DetailRow label="ID entity" value={detailLog.entityId} mono />
            <DetailRow label="Provedl" value={`${detailLog.performer.name} (${detailLog.performer.email})`} />
            <DetailRow label="IP adresa" value={detailLog.ipAddress ?? "—"} mono />
            <DetailRow label="Čas" value={formatDateTime(detailLog.createdAt)} />
            {detailLog.details && (
              <div>
                <p className="mb-1 text-xs font-medium text-foreground-secondary">
                  Detaily
                </p>
                <pre className="overflow-auto rounded-lg bg-background p-3 text-xs text-foreground font-mono max-h-64">
                  {JSON.stringify(detailLog.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ═══ DETAIL MODAL — Security Event ═══════════════════════════ */}
      {detailEvent && (
        <Modal onClose={() => setDetailEvent(null)} title="Detail bezpečnostní události">
          <div className="space-y-4">
            <DetailRow label="ID" value={detailEvent.id} mono />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground-secondary w-24">
                Závažnost
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  SEVERITY_CONFIG[detailEvent.severity]?.color ?? "bg-gray-100 text-gray-700",
                )}
              >
                {SEVERITY_CONFIG[detailEvent.severity]?.icon}
                {detailEvent.severity}
              </span>
            </div>
            <DetailRow
              label="Typ"
              value={SECURITY_TYPE_LABELS[detailEvent.type] ?? detailEvent.type}
            />
            <DetailRow
              label="Uživatel"
              value={detailEvent.user?.name ?? "—"}
            />
            <DetailRow label="Email" value={detailEvent.email ?? "—"} />
            <DetailRow label="IP adresa" value={detailEvent.ipAddress ?? "—"} mono />
            <DetailRow label="Čas" value={formatDateTime(detailEvent.createdAt)} />
            {detailEvent.userAgent && (
              <DetailRow label="User Agent" value={detailEvent.userAgent} mono />
            )}
            {detailEvent.details && (
              <div>
                <p className="mb-1 text-xs font-medium text-foreground-secondary">
                  Detaily
                </p>
                <pre className="overflow-auto rounded-lg bg-background p-3 text-xs text-foreground font-mono max-h-64">
                  {JSON.stringify(detailEvent.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ═══ DELETE CONFIRMATION MODAL ═════════════════════════════ */}
      {deleteConfirm && (
        <Modal
          onClose={() => {
            setDeleteConfirm(null);
            setDeleteEmail("");
          }}
          title="Smazat uživatele"
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-700 dark:text-red-400">
                    Tato akce je nevratná!
                  </p>
                  <p className="mt-1 text-red-600/80 dark:text-red-400/80">
                    Všechna data uživatele budou trvale smazána včetně žádostí,
                    příspěvků, hlasování, zpráv a bodů.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-background p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-secondary">Jméno:</span>
                <span className="font-medium text-foreground">{deleteConfirm.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-secondary">Email:</span>
                <span className="font-medium text-foreground">{deleteConfirm.email}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-secondary">Role:</span>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                    ROLE_COLORS[deleteConfirm.role] ?? "bg-gray-100 text-gray-700",
                  )}
                >
                  {ROLE_LABELS[deleteConfirm.role] ?? deleteConfirm.role}
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Pro potvrzení zadejte email uživatele:{" "}
                <span className="font-mono text-accent">{deleteConfirm.email}</span>
              </label>
              <input
                type="email"
                value={deleteEmail}
                onChange={(e) => setDeleteEmail(e.target.value)}
                placeholder={deleteConfirm.email}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setDeleteConfirm(null);
                  setDeleteEmail("");
                }}
                className="flex-1 rounded-xl border border-border bg-card py-2.5 text-sm font-medium text-foreground hover:bg-card-hover"
              >
                Zrušit
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isPending || deleteEmail !== deleteConfirm.email}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="mr-1.5 inline h-4 w-4" />
                Smazat uživatele
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

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
            bgColor,
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

function Pagination({
  page,
  totalPages,
  onPageChange,
  isPending,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  isPending: boolean;
}) {
  const pages = generatePaginationPages(page, totalPages);

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1 || isPending}
        className="rounded-lg border border-border bg-card p-2 text-foreground-secondary hover:bg-card-hover disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`dots-${idx}`} className="px-2 text-foreground-muted">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            disabled={isPending}
            className={cn(
              "min-w-8 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              p === page
                ? "bg-accent text-white"
                : "border border-border bg-card text-foreground-secondary hover:bg-card-hover",
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages || isPending}
        className="rounded-lg border border-border bg-card p-2 text-foreground-secondary hover:bg-card-hover disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Modal({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-foreground-secondary hover:bg-background"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-24 shrink-0 text-xs font-medium text-foreground-secondary">
        {label}
      </span>
      <span
        className={cn(
          "text-sm text-foreground break-all",
          mono && "font-mono text-xs",
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(date: Date) {
  return new Date(date).toLocaleString("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function generatePaginationPages(
  current: number,
  total: number,
): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");

  pages.push(total);

  return pages;
}
