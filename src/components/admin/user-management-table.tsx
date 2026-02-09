"use client";

import { useState, useTransition, useRef } from "react";
import {
  Search,
  UserPlus,
  KeyRound,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertTriangle,
  UserMinus,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
  toggleUserActive,
} from "@/actions/admin-users";
import { useRouter } from "next/navigation";

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

interface UserManagementTableProps {
  users: UserRow[];
  departments: Department[];
}

type SortField = "name" | "email" | "role" | "department" | "isActive";

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

export function UserManagementTable({
  users,
  departments,
}: UserManagementTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<UserRow | null>(null);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const createFormRef = useRef<HTMLFormElement>(null);

  // Filter
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.department?.name.toLowerCase().includes(q) ?? false) ||
      (u.position?.toLowerCase().includes(q) ?? false);
    const matchesRole = !roleFilter || u.role === roleFilter;
    const matchesStatus =
      !statusFilter ||
      (statusFilter === "active" && u.isActive) ||
      (statusFilter === "inactive" && !u.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "name":
        cmp = a.name.localeCompare(b.name, "cs");
        break;
      case "email":
        cmp = a.email.localeCompare(b.email);
        break;
      case "role":
        cmp = a.role.localeCompare(b.role);
        break;
      case "department":
        cmp = (a.department?.name ?? "").localeCompare(
          b.department?.name ?? "",
          "cs"
        );
        break;
      case "isActive":
        cmp = Number(b.isActive) - Number(a.isActive);
        break;
    }
    return sortAsc ? cmp : -cmp;
  });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field)
      return <ChevronDown className="h-3 w-3 text-foreground-muted" />;
    return sortAsc ? (
      <ChevronUp className="h-3 w-3 text-accent" />
    ) : (
      <ChevronDown className="h-3 w-3 text-accent" />
    );
  }

  async function handleCreateUser(formData: FormData) {
    startTransition(async () => {
      const result = await createUser(formData);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({
          type: "success",
          text: `Uživatel ${result.userName ?? ""} vytvořen`,
        });
        setShowCreateForm(false);
        createFormRef.current?.reset();
        router.refresh();
      }
    });
  }

  async function handleUpdateUser(formData: FormData) {
    startTransition(async () => {
      const result = await updateUser(formData);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Uživatel upraven" });
        setEditingId(null);
        router.refresh();
      }
    });
  }

  async function handleResetPassword(formData: FormData) {
    startTransition(async () => {
      const result = await resetPassword(formData);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Heslo resetováno" });
        setResetId(null);
        router.refresh();
      }
    });
  }

  async function handleDeleteUser() {
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
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
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
  }

  return (
    <div className="space-y-4">
      {/* Message */}
      {message && (
        <div
          className={cn(
            "flex items-center justify-between rounded-lg px-4 py-2 text-sm",
            message.type === "success"
              ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
              : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400"
          )}
        >
          {message.text}
          <button onClick={() => setMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
          <input
            type="text"
            placeholder="Hledat uživatele..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        >
          <option value="">Všechny role</option>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Manager</option>
          <option value="EMPLOYEE">Zaměstnanec</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        >
          <option value="">Všechny stavy</option>
          <option value="active">Aktivní</option>
          <option value="inactive">Neaktivní</option>
        </select>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-accent glow-blue hover:bg-accent-hover active:scale-95 transition-all"
        >
          <UserPlus className="h-4 w-4" />
          Nový uživatel
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <form
          ref={createFormRef}
          action={handleCreateUser}
          className="rounded-xl border border-accent/30 bg-accent-light p-4 space-y-3"
        >
          <h4 className="font-medium text-foreground">Nový uživatel</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                Jméno a příjmení *
              </label>
              <input
                name="name"
                placeholder="Jan Novák"
                required
                minLength={2}
                maxLength={100}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                Email *
              </label>
              <input
                name="email"
                type="email"
                placeholder="jan.novak@firma.cz"
                required
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                Heslo * (min. 8 znaků, velké+malé+číslo+spec. znak)
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Bezpečné heslo"
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 pr-9 text-sm text-foreground outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                Role *
              </label>
              <select
                name="role"
                defaultValue="EMPLOYEE"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              >
                <option value="EMPLOYEE">Zaměstnanec</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                Pozice
              </label>
              <input
                name="position"
                placeholder="Např. Operátor CNC"
                maxLength={100}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                Oddělení
              </label>
              <select
                name="departmentId"
                defaultValue=""
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              >
                <option value="">Bez oddělení</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                Telefon
              </label>
              <input
                name="phone"
                type="tel"
                placeholder="+420 xxx xxx xxx"
                maxLength={20}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                Datum nástupu
              </label>
              <input
                name="hireDate"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isPending ? "Vytvářím..." : "Vytvořit"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground-secondary hover:bg-background-secondary"
            >
              Zrušit
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background-secondary/70">
              {(
                [
                  ["name", "Jméno"],
                  ["email", "Email"],
                  ["role", "Role"],
                  ["department", "Oddělení"],
                  ["isActive", "Stav"],
                ] as [SortField, string][]
              ).map(([field, label]) => (
                <th
                  key={field}
                  onClick={() => toggleSort(field)}
                  className="cursor-pointer px-4 py-3 text-left font-medium text-foreground-secondary select-none hover:text-foreground"
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    <SortIcon field={field} />
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 text-left font-medium text-foreground-secondary">
                Body
              </th>
              <th className="px-4 py-3 text-right font-medium text-foreground-secondary">
                Akce
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((user) => (
              <tr
                key={user.id}
                className={cn(
                  "border-b border-border transition-colors hover:bg-background-secondary/50",
                  !user.isActive && "opacity-50"
                )}
              >
                {editingId === user.id ? (
                  <EditRow
                    user={user}
                    departments={departments}
                    onSave={handleUpdateUser}
                    onCancel={() => setEditingId(null)}
                    isPending={isPending}
                  />
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {user.name}
                      {user.position && (
                        <span className="block text-xs text-foreground-muted">
                          {user.position}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground-secondary">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                          ROLE_COLORS[user.role] ?? "bg-slate-100 text-slate-700"
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
                          "inline-block h-2.5 w-2.5 rounded-full",
                          user.isActive ? "bg-green-500" : "bg-background-secondary"
                        )}
                        title={user.isActive ? "Aktivní" : "Neaktivní"}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      {user.pointsBalance}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingId(user.id)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent-light transition-colors"
                        >
                          Upravit
                        </button>
                        <button
                          onClick={() =>
                            setResetId(resetId === user.id ? null : user.id)
                          }
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                          title="Reset hesla"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user.id, !user.isActive)}
                          disabled={isPending}
                          className={cn(
                            "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                            user.isActive
                              ? "text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30"
                              : "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
                          )}
                          title={user.isActive ? "Deaktivovat" : "Aktivovat"}
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteConfirm(user);
                            setDeleteEmail("");
                          }}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title="Smazat uživatele"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {/* Password reset inline */}
                      {resetId === user.id && (
                        <form
                          action={handleResetPassword}
                          className="mt-2 flex items-center gap-2"
                        >
                          <input type="hidden" name="userId" value={user.id} />
                          <input
                            name="newPassword"
                            type="password"
                            placeholder="Min. 8 znaků"
                            required
                            minLength={8}
                            className="w-32 rounded border border-border px-2 py-1 text-xs bg-card text-foreground outline-none focus:border-accent"
                          />
                          <button
                            type="submit"
                            disabled={isPending}
                            className="rounded bg-amber-500 px-2 py-1 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                          >
                            Reset
                          </button>
                        </form>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-foreground-muted"
                >
                  Žádní uživatelé nenalezeni
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-foreground-muted">
        Celkem: {filtered.length} uživatel
        {filtered.length === 1
          ? ""
          : filtered.length >= 2 && filtered.length <= 4
            ? "é"
            : "ů"}
      </p>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-red-200 dark:border-red-900/50 bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Smazat uživatele
                </h3>
                <p className="text-sm text-foreground-secondary">
                  Tato akce je nevratná!
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
              <p>
                Chystáte se smazat uživatele{" "}
                <strong>{deleteConfirm.name}</strong> (
                {deleteConfirm.email}). Všechna data budou
                trvale odstraněna.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Pro potvrzení zadejte email uživatele:
              </label>
              <input
                type="email"
                value={deleteEmail}
                onChange={(e) => setDeleteEmail(e.target.value)}
                placeholder={deleteConfirm.email}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleDeleteUser}
                disabled={
                  isPending ||
                  deleteEmail.toLowerCase() !==
                    deleteConfirm.email.toLowerCase()
                }
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                {isPending ? "Mažu..." : "Smazat trvale"}
              </button>
              <button
                onClick={() => {
                  setDeleteConfirm(null);
                  setDeleteEmail("");
                }}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-background-secondary transition-colors"
              >
                Zrušit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline edit row ─────────────────────────────────────────────────────────

function EditRow({
  user,
  departments,
  onSave,
  onCancel,
  isPending,
}: {
  user: UserRow;
  departments: Department[];
  onSave: (fd: FormData) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <td colSpan={7} className="px-4 py-3">
      <form action={onSave} className="space-y-3">
        <input type="hidden" name="userId" value={user.id} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div>
            <label className="text-xs text-foreground-secondary">Jméno *</label>
            <input
              name="name"
              defaultValue={user.name}
              required
              minLength={2}
              maxLength={100}
              className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-foreground-secondary">Email *</label>
            <input
              name="email"
              type="email"
              defaultValue={user.email}
              required
              className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-foreground-secondary">Role</label>
            <select
              name="role"
              defaultValue={user.role}
              className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
            >
              <option value="EMPLOYEE">Zaměstnanec</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-foreground-secondary">Oddělení</label>
            <select
              name="departmentId"
              defaultValue={user.department ? departments.find(d => d.name === user.department?.name)?.id ?? "" : ""}
              className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
            >
              <option value="">Bez oddělení</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-foreground-secondary">Pozice</label>
            <input
              name="position"
              defaultValue={user.position ?? ""}
              maxLength={100}
              className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-foreground-secondary">Telefon</label>
            <input
              name="phone"
              type="tel"
              defaultValue={user.phone ?? ""}
              maxLength={20}
              className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-foreground-secondary">Stav</label>
            <select
              name="isActive"
              defaultValue={user.isActive ? "true" : "false"}
              className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
            >
              <option value="true">Aktivní</option>
              <option value="false">Neaktivní</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            Uložit
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground-secondary hover:bg-background-secondary"
          >
            Zrušit
          </button>
        </div>
      </form>
    </td>
  );
}
