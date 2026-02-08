"use client";

import { useState, useTransition } from "react";
import {
  Gift,
  Check,
  X,
  Clock,
  Loader2,
  Star,
  Filter,
  User,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { fulfillRewardClaim, cancelRewardClaim } from "@/actions/admin-rewards";
import { cn } from "@/lib/utils";

interface ClaimRow {
  id: string;
  status: string;
  createdAt: Date;
  reward: { name: string; pointsCost: number; imageUrl: string | null };
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}

interface RewardClaimsManagerProps {
  claims: ClaimRow[];
}

const STATUS_TABS = [
  { key: "ALL", label: "Vše" },
  { key: "PENDING", label: "Čekající" },
  { key: "FULFILLED", label: "Schválené" },
  { key: "CANCELLED", label: "Zamítnuté" },
] as const;

export function RewardClaimsManager({ claims }: RewardClaimsManagerProps) {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered =
    statusFilter === "ALL"
      ? claims
      : claims.filter((c) => c.status === statusFilter);

  const pendingCount = claims.filter((c) => c.status === "PENDING").length;

  const handleAction = (claimId: string, action: "fulfill" | "cancel") => {
    setActioningId(claimId);
    startTransition(async () => {
      if (action === "fulfill") {
        await fulfillRewardClaim(claimId);
      } else {
        await cancelRewardClaim(claimId);
      }
      setActioningId(null);
    });
  };

  return (
    <div className="space-y-4">
      {/* Stat bar */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/30">
          <Gift className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Žádosti o odměny
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {pendingCount > 0
              ? `${pendingCount} čeká na schválení`
              : "Žádné čekající žádosti"}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {STATUS_TABS.map((t) => {
          const count =
            t.key === "ALL"
              ? claims.length
              : claims.filter((c) => c.status === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
                statusFilter === t.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600",
              )}
            >
              <Filter className="h-3 w-3" />
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  statusFilter === t.key
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Claims list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-300">
          <Gift className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Žádné žádosti v této kategorii
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((claim, i) => {
            const isActioning = actioningId === claim.id && isPending;
            return (
              <div
                key={claim.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
              >
                <div className="flex items-start gap-3">
                  {/* User avatar */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                    {claim.user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={claim.user.avatarUrl}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-slate-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {claim.user.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {claim.reward.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {claim.reward.pointsCost} bodů
                      </span>
                      <span className="text-[11px] text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {new Date(claim.createdAt).toLocaleDateString("cs-CZ", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Status / Actions */}
                  {claim.status === "PENDING" ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleAction(claim.id, "fulfill")}
                        disabled={isActioning}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all active:scale-90 disabled:opacity-50"
                        title="Schválit"
                      >
                        {isActioning ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleAction(claim.id, "cancel")}
                        disabled={isActioning}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all active:scale-90 disabled:opacity-50"
                        title="Zamítnout (vrátí body)"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium shrink-0",
                        claim.status === "FULFILLED"
                          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                          : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
                      )}
                    >
                      {claim.status === "FULFILLED" ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          Schváleno
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" />
                          Zamítnuto
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
