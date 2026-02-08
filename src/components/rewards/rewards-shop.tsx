"use client";

import { useState } from "react";
import { Star, History, ShoppingBag, Gift, Clock, Check, X, Sparkles } from "lucide-react";
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
      {/* Balance header — animated gradient */}
      <div className="animate-fade-in-up relative overflow-hidden rounded-2xl bg-linear-to-br from-amber-500 via-orange-500 to-yellow-500 animate-gradient p-5 text-white shadow-lg shadow-amber-500/25">
        <div className="absolute inset-0 animate-shimmer" />
        {/* Decorative sparkles */}
        <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/30 animate-sparkle" />
        <Sparkles className="absolute bottom-4 right-12 h-3 w-3 text-white/20 animate-sparkle" style={{ animationDelay: "1s" }} />
        <div className="relative">
          <p className="text-sm text-amber-100 font-medium">Váš zůstatek, {userName}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <Star className="h-7 w-7 fill-white text-white drop-shadow-md" />
            <span className="text-4xl font-extrabold tracking-tight drop-shadow-sm">{userBalance}</span>
            <span className="text-sm text-amber-100 font-medium">bodů</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="animate-fade-in-up stagger-2 flex gap-1 rounded-xl bg-background-secondary p-1">
        <button
          onClick={() => setTab("shop")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all duration-300",
            tab === "shop"
              ? "bg-card text-foreground shadow-md"
              : "text-foreground-secondary hover:text-foreground",
          )}
        >
          <ShoppingBag className="h-4 w-4" />
          Obchod
        </button>
        <button
          onClick={() => setTab("history")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all duration-300",
            tab === "history"
              ? "bg-card text-foreground shadow-md"
              : "text-foreground-secondary hover:text-foreground",
          )}
        >
          <History className="h-4 w-4" />
          Historie
          {claims.length > 0 && (
            <span className="rounded-full bg-accent-light px-2 py-0.5 text-[11px] font-bold text-accent">
              {claims.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab content — animated transitions */}
      <div key={tab} className="animate-tab-content">
        {tab === "shop" ? (
          rewards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up">
              <Gift className="mb-3 h-14 w-14 text-foreground-muted" />
              <p className="text-sm font-medium text-foreground-secondary">
                Žádné odměny k dispozici
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                Nové odměny brzy přidáme!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {rewards.map((reward, i) => (
                <RewardCard key={reward.id} reward={reward} userBalance={userBalance} index={i} />
              ))}
            </div>
          )
        ) : claims.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up">
            <History className="mb-3 h-14 w-14 text-foreground-muted" />
            <p className="text-sm font-medium text-foreground-secondary">
              Zatím žádné uplatnění
            </p>
            <p className="mt-1 text-xs text-foreground-muted">
              Vyberte si odměnu z obchodu
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {claims.map((claim, i) => {
              const status = STATUS_MAP[claim.status] ?? STATUS_MAP.PENDING;
              return (
                <div
                  key={claim.id}
                  className="animate-fade-in-up card-hover flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                  style={{ "--delay": `${i * 60}ms` } as React.CSSProperties}
                >
                  {/* Icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                    <Gift className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {claim.reward.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-foreground-secondary">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {claim.reward.pointsCost} bodů
                      </span>
                      <span className="text-xs text-foreground-muted">•</span>
                      <span className="text-xs text-foreground-muted">
                        {new Date(claim.createdAt).toLocaleDateString("cs-CZ")}
                      </span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0 transition-colors",
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
    </div>
  );
}
