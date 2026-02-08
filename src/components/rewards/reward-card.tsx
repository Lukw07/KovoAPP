"use client";

import { useState, useTransition } from "react";
import { Gift, Star, Loader2, Check, ShoppingCart, Sparkles } from "lucide-react";
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
  index?: number;
}

export function RewardCard({ reward, userBalance, index = 0 }: RewardCardProps) {
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
    <div
      className="animate-fade-in-scale card-hover rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
      style={{ "--delay": `${index * 80}ms` } as React.CSSProperties}
    >
      {/* Image or gradient placeholder */}
      {reward.imageUrl ? (
        <div className="relative h-36 w-full overflow-hidden group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={reward.imageUrl}
            alt={reward.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
        </div>
      ) : (
        <div className="relative flex h-36 w-full items-center justify-center bg-linear-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-900/20 dark:via-orange-900/15 dark:to-yellow-900/20 overflow-hidden group">
          <div className="absolute inset-0 animate-shimmer" />
          <Gift className="h-14 w-14 text-amber-300 dark:text-amber-600 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12" />
          {/* Floating sparkles */}
          <Sparkles className="absolute top-3 right-3 h-4 w-4 text-amber-200 dark:text-amber-700 animate-sparkle" />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Title + stock */}
        <div>
          <h3 className="text-sm font-bold text-foreground leading-tight">
            {reward.name}
          </h3>
          {reward.description && (
            <p className="mt-1 text-xs text-foreground-secondary line-clamp-2 leading-relaxed">
              {reward.description}
            </p>
          )}
        </div>

        {/* Price + stock indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400 animate-sparkle" />
            <span className="text-base font-extrabold text-foreground">
              {reward.pointsCost}
            </span>
            <span className="text-[11px] text-foreground-muted">
              bodů
            </span>
          </div>

          {reward.stock >= 0 && (
            <span
              className={cn(
                "text-[11px] font-semibold rounded-full px-2.5 py-0.5 transition-colors",
                isSoldOut
                  ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                  : reward.stock <= 5
                    ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                    : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
              )}
            >
              {isSoldOut
                ? "Vyprodáno"
                : `${reward.stock} ks`}
            </span>
          )}
        </div>

        {/* Claim button */}
        <button
          onClick={handleClaim}
          disabled={isDisabled}
          className={cn(
            "btn-press w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-300",
            claimed
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
              : canAfford && !isSoldOut
                ? "bg-accent text-white hover:bg-accent-hover shadow-[0_4px_14px_var(--accent-glow)]"
                : "bg-background-secondary text-foreground-muted cursor-not-allowed",
          )}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : claimed ? (
            <span className="flex items-center gap-2 animate-bounce-in">
              <Check className="h-4 w-4 animate-check-pop" />
              Uplatněno!
            </span>
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
          <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2 animate-fade-in-up">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
