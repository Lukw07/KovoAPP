"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import {
  ShoppingBag,
  Search,
  Tag,
  Heart,
  User,
  Trash2,
  Package,
  HandHelping,
  Megaphone,
  Gift,
} from "lucide-react";
import { deactivateListing } from "@/actions/marketplace";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  SELLING: {
    label: "Prodám",
    icon: <Tag className="h-3 w-3" />,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
  },
  BUYING: {
    label: "Koupím",
    icon: <ShoppingBag className="h-3 w-3" />,
    color: "text-blue-700",
    bg: "bg-blue-50",
  },
  LOOKING_FOR: {
    label: "Hledám",
    icon: <Search className="h-3 w-3" />,
    color: "text-amber-700",
    bg: "bg-amber-50",
  },
  OFFERING: {
    label: "Nabízím",
    icon: <Gift className="h-3 w-3" />,
    color: "text-purple-700",
    bg: "bg-purple-50",
  },
};

export interface ListingData {
  id: string;
  title: string;
  description: string;
  category: string;
  price: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    department?: { name: string } | null;
  };
}

interface ListingCardProps {
  listing: ListingData;
  isOwner?: boolean;
  onRemoved?: () => void;
}

export function ListingCard({ listing, isOwner, onRemoved }: ListingCardProps) {
  const [isPending, startTransition] = useTransition();
  const meta = CATEGORY_META[listing.category] || CATEGORY_META.SELLING;

  const handleDeactivate = () => {
    if (!confirm("Opravdu chcete stáhnout tento inzerát?")) return;
    startTransition(async () => {
      await deactivateListing(listing.id);
      onRemoved?.();
    });
  };

  const timeAgo = formatDistanceToNow(new Date(listing.createdAt), {
    addSuffix: true,
    locale: cs,
  });

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white dark:bg-slate-800 shadow-sm overflow-hidden",
        !listing.isActive ? "opacity-60 border-slate-100 dark:border-slate-800" : "border-slate-200 dark:border-slate-700"
      )}
    >
      {/* Image */}
      {listing.imageUrl && (
        <div className="h-36 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="p-4 space-y-2.5">
        {/* Category badge + price */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              meta.bg,
              meta.color
            )}
          >
            {meta.icon}
            {meta.label}
          </span>
          {listing.price && (
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {listing.price}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{listing.title}</h3>

        {/* Description */}
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 whitespace-pre-line">
          {listing.description}
        </p>

        {/* Author + time */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
              {listing.author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listing.author.avatarUrl}
                  alt=""
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <User className="h-3.5 w-3.5 text-slate-400" />
              )}
            </div>
            <div className="text-[11px]">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {listing.author.name}
              </span>
              {listing.author.department && (
                <span className="text-slate-400">
                  {" "}
                  · {listing.author.department.name}
                </span>
              )}
            </div>
          </div>
          <span className="text-[11px] text-slate-400">{timeAgo}</span>
        </div>

        {/* Owner: deactivate button */}
        {isOwner && listing.isActive && (
          <button
            onClick={handleDeactivate}
            disabled={isPending}
            className={cn(
              "w-full flex items-center justify-center gap-1.5 rounded-xl py-2",
              "border border-red-200 text-xs font-medium text-red-600",
              "hover:bg-red-50 active:scale-[0.98] transition-all",
              "disabled:opacity-50"
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isPending ? "Odstraňuji..." : "Stáhnout inzerát"}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MARKETPLACE FEED
// ---------------------------------------------------------------------------

interface MarketplaceFeedProps {
  listings: ListingData[];
  currentUserId?: string;
}

export function MarketplaceFeed({
  listings,
  currentUserId,
}: MarketplaceFeedProps) {
  const [filter, setFilter] = useState<string>("ALL");

  const tabs = [
    { key: "ALL", label: "Vše", icon: <Package className="h-3.5 w-3.5" /> },
    {
      key: "SELLING",
      label: "Prodám",
      icon: <Tag className="h-3.5 w-3.5" />,
    },
    {
      key: "BUYING",
      label: "Koupím",
      icon: <ShoppingBag className="h-3.5 w-3.5" />,
    },
    {
      key: "LOOKING_FOR",
      label: "Hledám",
      icon: <Search className="h-3.5 w-3.5" />,
    },
    {
      key: "OFFERING",
      label: "Nabízím",
      icon: <Gift className="h-3.5 w-3.5" />,
    },
  ];

  const filtered =
    filter === "ALL"
      ? listings
      : listings.filter((l) => l.category === filter);

  return (
    <div className="space-y-4">
      {/* Category filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all active:scale-95",
              filter === tab.key
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-16 text-center">
          <HandHelping className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Žádné inzeráty v této kategorii
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isOwner={currentUserId === listing.author.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
