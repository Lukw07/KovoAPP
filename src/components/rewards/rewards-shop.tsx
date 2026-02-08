"use client";

import { useState } from "react";
import { Star, History, ShoppingBag, Gift, Clock, Check, X } from "lucide-react";
import { RewardCard } from "./reward-card";
import { cn } from "@/lib/utils";

interface RewardData {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pointsCost: number;
  stock: number;
}

interface ClaimData {
  id: string;
  status: string;
  createdAt: Date;
  reward: {
    name: string;
    description: string | null;
    pointsCost: number;
    imageUrl: string | null;
  };
}

interface RewardsShopProps {
  rewards: RewardData[];
  claims: ClaimData[];
  userBalance: number;
  userName: string;
}

const STATUS_MAP: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  PENDING: {
    label: "Čeká na vyřízení",
    icon: <Clock className="h-3.5 w-3.5" />,
    className: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  },
  FULFILLED: {
    label: "Vyřízeno",
    icon: <Check className="h-3.5 w-3.5" />,
    className: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  },
  CANCELLED: {
    label: "Zrušeno",
    icon: <X className="h-3.5 w-3.5" />,
    className: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  },
};

export function RewardsShop({ rewards, claims, userBalance, userName }: RewardsShopProps) {
  const [tab, setTab] = useState<"shop" | "history">("shop");

  return (
    <div className="space-y-4">
      {/* Balance header */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-lg shadow-amber-500/20">
        <p className="text-sm text-amber-100">Váš zůstatek, {userName}</p>
        <div className="mt-2 flex items-center gap-2">
          <Star className="h-6 w-6 fill-white text-white" />
          <span className="text-3xl font-bold">{userBalance}</span>
          <span className="text-sm text-amber-100">bodů</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
        <button
          onClick={() => setTab("shop")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all",
            tab === "shop"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
          )}
        >
          <ShoppingBag className="h-4 w-4" />
          Obchod
        </button>
        <button
          onClick={() => setTab("history")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all",
            tab === "history"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
          )}
        >
          <History className="h-4 w-4" />
          Historie
          {claims.length > 0 && (
            <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400">
              {claims.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      {tab === "shop" ? (
        rewards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Gift className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Žádné odměny k dispozici
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Nové odměny brzy přidáme!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {rewards.map((reward) => (
              <RewardCard key={reward.id} reward={reward} userBalance={userBalance} />
            ))}
          </div>
        )
      ) : claims.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <History className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Zatím žádné uplatnění
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Vyberte si odměnu z obchodu
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {claims.map((claim) => {
            const status = STATUS_MAP[claim.status] ?? STATUS_MAP.PENDING;
            return (
              <div
                key={claim.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3"
              >
                {/* Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20">
                  <Gift className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {claim.reward.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {claim.reward.pointsCost} bodů
                    </span>
                    <span className="text-xs text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(claim.createdAt).toLocaleDateString("cs-CZ")}
                    </span>
                  </div>
                </div>

                {/* Status badge */}
                <span
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium shrink-0",
                    status.className,
                  )}
                >
                  {status.icon}
                  {status.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
