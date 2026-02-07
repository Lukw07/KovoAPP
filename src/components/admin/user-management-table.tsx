"use client";

import { useState, useTransition } from "react";
import {
  Search,
  UserPlus,
  KeyRound,
  Save,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createUser, updateUser, resetPassword } from "@/actions/admin-users";
import { useRouter } from "next/navigation";

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
  ADMIN: "bg-red-100 text-red-700",
  MANAGER: "bg-amber-100 text-amber-700",
  EMPLOYEE: "bg-blue-100 text-blue-700",
};

export function UserManagementTable({
  users,
  departments,
}: UserManagementTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Filter
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.department?.name.toLowerCase().includes(q) ?? false)
    );
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
      return <ChevronDown className="h-3 w-3 text-slate-300" />;
    return sortAsc ? (
      <ChevronUp className="h-3 w-3 text-blue-600" />
    ) : (
      <ChevronDown className="h-3 w-3 text-blue-600" />
    );
  }

  async function handleCreateUser(formData: FormData) {
    startTransition(async () => {
      const result = await createUser(formData);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Uživatel vytvořen" });
        setShowCreateForm(false);
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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Hledat uživatele..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 pl-9 pr-3 text-sm dark:text-slate-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
          />
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 active:scale-95 transition-all"
        >
          <UserPlus className="h-4 w-4" />
          Nový uživatel
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <form
          action={handleCreateUser}
          className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 p-4 space-y-3"
        >
          <h4 className="font-medium text-slate-800 dark:text-slate-200">Nový uživatel</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              name="name"
              placeholder="Jméno a příjmení"
              required
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm dark:text-slate-200 outline-none focus:border-blue-400"
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm dark:text-slate-200 outline-none focus:border-blue-400"
            />
            <input
              name="password"
              type="password"
              placeholder="Heslo (min. 6 znaků)"
              required
              minLength={6}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm dark:text-slate-200 outline-none focus:border-blue-400"
            />
            <select
              name="role"
              defaultValue="EMPLOYEE"
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm dark:text-slate-200 outline-none focus:border-blue-400"
            >
              <option value="EMPLOYEE">Zaměstnanec</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
            <input
              name="position"
              placeholder="Pozice (volitelné)"
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm dark:text-slate-200 outline-none focus:border-blue-400"
            />
            <select
              name="departmentId"
              defaultValue=""
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm dark:text-slate-200 outline-none focus:border-blue-400"
            >
              <option value="">Bez oddělení</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Vytvořit
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Zrušit
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70">
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
                  className="cursor-pointer px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400 select-none hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    <SortIcon field={field} />
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                Body
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                Akce
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((user) => (
              <tr
                key={user.id}
                className={cn(
                  "border-b border-slate-50 dark:border-slate-700 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/50",
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
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {user.name}
                      {user.position && (
                        <span className="block text-xs text-slate-400 dark:text-slate-500">
                          {user.position}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{user.email}</td>
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
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {user.department?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-block h-2.5 w-2.5 rounded-full",
                          user.isActive ? "bg-green-500" : "bg-slate-300"
                        )}
                        title={user.isActive ? "Aktivní" : "Neaktivní"}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                      {user.pointsBalance}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingId(user.id)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
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
                            placeholder="Nové heslo"
                            required
                            minLength={6}
                            className="w-32 rounded border border-slate-200 dark:border-slate-600 px-2 py-1 text-xs dark:bg-slate-700 dark:text-slate-200 outline-none focus:border-blue-400"
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
                  className="px-4 py-8 text-center text-slate-400 dark:text-slate-500"
                >
                  Žádní uživatelé nenalezeni
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Celkem: {filtered.length} uživatel
        {filtered.length === 1
          ? ""
          : filtered.length >= 2 && filtered.length <= 4
            ? "é"
            : "ů"}
      </p>
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
            <label className="text-xs text-slate-500 dark:text-slate-400">Jméno</label>
            <input
              name="name"
              defaultValue={user.name}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-sm dark:text-slate-200 outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400">Email</label>
            <input
              name="email"
              defaultValue={user.email}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-sm dark:text-slate-200 outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400">Role</label>
            <select
              name="role"
              defaultValue={user.role}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-sm dark:text-slate-200 outline-none focus:border-blue-400"
            >
              <option value="EMPLOYEE">Zaměstnanec</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400">Oddělení</label>
            <select
              name="departmentId"
              defaultValue={user.department ? departments.find(d => d.name === user.department?.name)?.id ?? "" : ""}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-sm dark:text-slate-200 outline-none focus:border-blue-400"
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
            <label className="text-xs text-slate-500 dark:text-slate-400">Pozice</label>
            <input
              name="position"
              defaultValue={user.position ?? ""}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-sm dark:text-slate-200 outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400">Stav</label>
            <select
              name="isActive"
              defaultValue={user.isActive ? "true" : "false"}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-sm dark:text-slate-200 outline-none focus:border-blue-400"
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
            className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Zrušit
          </button>
        </div>
      </form>
    </td>
  );
}
