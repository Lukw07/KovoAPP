"use client";

import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import Image from "next/image";
import {
  Search,
  Star,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Clock,
  User,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { givePoints, getActiveUsersForPoints, getRecentTransactions } from "@/actions/points";

/* ── Types ─────────────────────────────────────────── */

type UserOption = {
  id: string;
  name: string;
  avatarUrl: string | null;
  position: string | null;
  pointsBalance: number;
  department: { name: string } | null;
};

type Transaction = {
  id: string;
  amount: number;
  reason: string;
  category: string | null;
  createdAt: Date;
  user: { id: string; name: string; avatarUrl: string | null; position: string | null };
  admin: { id: string; name: string } | null;
};

const CATEGORIES = [
  { value: "performance", label: "Výkon", emoji: "🎯" },
  { value: "teamwork", label: "Týmová práce", emoji: "🤝" },
  { value: "innovation", label: "Inovace", emoji: "💡" },
  { value: "initiative", label: "Iniciativa", emoji: "🚀" },
  { value: "quality", label: "Kvalita", emoji: "⭐" },
  { value: "other", label: "Ostatní", emoji: "📌" },
];

const QUICK_AMOUNTS = [10, 25, 50, 100, 250];

/* ── Main Component ────────────────────────────────── */

export function PointsManager() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("performance");
  const [showSuccess, setShowSuccess] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [userList, txList] = await Promise.all([
        getActiveUsersForPoints(),
        getRecentTransactions(15),
      ]);
      setUsers(userList);
      setTransactions(txList);
    } catch {
      toast.error("Nepodařilo se načíst data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Filtered users
  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.department?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Submit handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser || !amount || !reason.trim()) {
      toast.error("Vyplňte všechna povinná pole");
      return;
    }

    const fd = new FormData();
    fd.set("userId", selectedUser.id);
    fd.set("amount", amount);
    fd.set("reason", reason.trim());
    fd.set("category", category);

    startTransition(async () => {
      const result = await givePoints(fd);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setShowSuccess(true);
      toast.success(`${amount} bodů uděleno uživateli ${selectedUser.name}`);

      // Reset form
      setTimeout(() => {
        setSelectedUser(null);
        setSearchQuery("");
        setAmount("");
        setReason("");
        setCategory("performance");
        setShowSuccess(false);
      }, 1500);

      // Reload transactions
      const txList = await getRecentTransactions(15);
      setTransactions(txList);

      // Update user balance locally
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? { ...u, pointsBalance: u.pointsBalance + parseInt(amount) }
            : u
        )
      );
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-foreground-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Award form card ───────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border bg-linear-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
            <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Udělit body</h3>
            <p className="text-xs text-foreground-secondary">
              Vyberte zaměstnance a zadejte počet bodů
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* ── User picker ─────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Zaměstnanec <span className="text-red-500">*</span>
            </label>
            <div ref={dropdownRef} className="relative">
              {selectedUser ? (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                  <UserAvatar
                    name={selectedUser.name}
                    avatarUrl={selectedUser.avatarUrl}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {selectedUser.name}
                    </p>
                    <p className="text-xs text-foreground-secondary truncate">
                      {selectedUser.position ?? selectedUser.department?.name ?? ""}
                      {" · "}
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        {selectedUser.pointsBalance} bodů
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setSearchQuery("");
                      setTimeout(() => searchInputRef.current?.focus(), 50);
                    }}
                    className="rounded-lg p-1.5 text-foreground-secondary hover:bg-card-hover hover:text-foreground transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-secondary" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Hledat zaměstnance..."
                      className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-secondary pointer-events-none" />
                  </div>

                  {showDropdown && (
                    <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-border bg-card shadow-lg max-h-60 overflow-y-auto">
                      {filteredUsers.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-foreground-secondary">
                          Žádný zaměstnanec nenalezen
                        </p>
                      ) : (
                        filteredUsers.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setSelectedUser(u);
                              setShowDropdown(false);
                              setSearchQuery("");
                            }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-card-hover transition-colors text-left"
                          >
                            <UserAvatar
                              name={u.name}
                              avatarUrl={u.avatarUrl}
                              size="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {u.name}
                              </p>
                              <p className="text-xs text-foreground-secondary truncate">
                                {[u.position, u.department?.name].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 tabular-nums shrink-0">
                              {u.pointsBalance} b
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Amount ──────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Počet bodů <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={1}
                max={10000}
                placeholder="Zadejte počet bodů"
                className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all tabular-nums"
              />
            </div>
            {/* Quick amount buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className={cn(
                    "rounded-lg px-3 py-1 text-xs font-medium transition-all active:scale-95",
                    amount === String(q)
                      ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                      : "bg-card border border-border text-foreground-secondary hover:bg-card-hover"
                  )}
                >
                  +{q}
                </button>
              ))}
            </div>
          </div>

          {/* ── Category ────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Kategorie</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-95",
                    category === cat.value
                      ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                      : "bg-card border border-border text-foreground-secondary hover:bg-card-hover"
                  )}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Reason ──────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Důvod <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Popište důvod udělení bodů..."
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all resize-none"
            />
            <p className="text-[11px] text-foreground-secondary text-right tabular-nums">
              {reason.length}/500
            </p>
          </div>

          {/* ── Submit ──────────────────────────────── */}
          <button
            type="submit"
            disabled={isPending || !selectedUser || !amount || !reason.trim() || showSuccess}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98]",
              showSuccess
                ? "bg-emerald-600 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {showSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Body uděleny!
              </>
            ) : isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Udělování...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Udělit {amount ? `${amount} bodů` : "body"}
              </>
            )}
          </button>
        </form>
      </div>

      {/* ── Recent transactions ───────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Clock className="h-5 w-5 text-foreground-secondary" />
          <h3 className="font-semibold text-foreground">Poslední transakce</h3>
        </div>

        {transactions.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-foreground-secondary">
            Zatím žádné transakce
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-card-hover transition-colors"
              >
                {/* Icon */}
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    tx.amount > 0
                      ? "bg-emerald-50 dark:bg-emerald-900/30"
                      : "bg-red-50 dark:bg-red-900/30"
                  )}
                >
                  {tx.amount > 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                </div>

                {/* User & reason */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground truncate">
                      {tx.user.name}
                    </p>
                    {tx.category && (
                      <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md font-medium shrink-0">
                        {CATEGORIES.find((c) => c.value === tx.category)?.label ?? tx.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground-secondary truncate">
                    {tx.reason}
                  </p>
                </div>

                {/* Amount & meta */}
                <div className="text-right shrink-0">
                  <p
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      tx.amount > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {tx.amount > 0 ? "+" : ""}
                    {tx.amount}
                  </p>
                  <p className="text-[10px] text-foreground-secondary">
                    {formatTimeAgo(new Date(tx.createdAt))}
                    {tx.admin && (
                      <> · {tx.admin.name.split(" ")[0]}</>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────── */

function UserAvatar({
  name,
  avatarUrl,
  size = "sm",
}: {
  name: string;
  avatarUrl: string | null;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={size === "sm" ? 32 : 40}
        height={size === "sm" ? 32 : 40}
        className={`${dim} rounded-lg object-cover shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${dim} rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0`}
    >
      <span className={`${textSize} font-semibold text-blue-600 dark:text-blue-400`}>
        {name?.[0]?.toUpperCase() ?? "?"}
      </span>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "teď";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
}
