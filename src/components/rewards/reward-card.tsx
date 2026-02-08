"use client";

import { useState, useTransition } from "react";
import { Gift, Star, Loader2, Check, ShoppingCart } from "lucide-react";
import { claimReward } from "@/actions/rewards";
import { cn } from "@/lib/utils";

interface RewardData {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pointsCost: number;
  stock: number;
}

interface RewardCardProps {
  reward: RewardData;
  userBalance: number;
}

export function RewardCard({ reward, userBalance }: RewardCardProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  const canAfford = userBalance >= reward.pointsCost;
  const isSoldOut = reward.stock === 0;
  const isDisabled = !canAfford || isSoldOut || isPending || claimed;

  const handleClaim = () => {
    if (isDisabled) return;
    setError(null);

    startTransition(async () => {
      const result = await claimReward(reward.id);
      if (result.error) {
        setError(result.error);
      } else {
        setClaimed(true);
        setTimeout(() => setClaimed(false), 3000);
      }
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      {/* Image or gradient placeholder */}
      {reward.imageUrl ? (
        <div className="h-32 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={reward.imageUrl}
            alt={reward.name}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
          <Gift className="h-12 w-12 text-amber-300 dark:text-amber-600" />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Title + stock */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {reward.name}
          </h3>
          {reward.description && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
              {reward.description}
            </p>
          )}
        </div>

        {/* Price + stock indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {reward.pointsCost}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              bodů
            </span>
          </div>

          {reward.stock >= 0 && (
            <span
              className={cn(
                "text-[11px] font-medium rounded-full px-2 py-0.5",
                isSoldOut
                  ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                  : reward.stock <= 5
                    ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                    : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
              )}
            >
              {isSoldOut
                ? "Vyprodáno"
                : `Skladem ${reward.stock} ks`}
            </span>
          )}
        </div>

        {/* Claim button */}
        <button
          onClick={handleClaim}
          disabled={isDisabled}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-[0.98]",
            claimed
              ? "bg-emerald-500 text-white"
              : canAfford && !isSoldOut
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20"
                : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed",
          )}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : claimed ? (
            <>
              <Check className="h-4 w-4" />
              Uplatněno!
            </>
          ) : isSoldOut ? (
            "Vyprodáno"
          ) : !canAfford ? (
            `Chybí ${reward.pointsCost - userBalance} bodů`
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              Uplatnit
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
