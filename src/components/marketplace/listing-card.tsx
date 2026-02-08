"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import {
  ShoppingBag,
  Search,
  Tag,
  User,
  Trash2,
  Package,
  HandHelping,
  Gift,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  MessageCircle,
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
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
  },
  BUYING: {
    label: "Koupím",
    icon: <ShoppingBag className="h-3 w-3" />,
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/30",
  },
  LOOKING_FOR: {
    label: "Hledám",
    icon: <Search className="h-3 w-3" />,
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
  },
  OFFERING: {
    label: "Nabízím",
    icon: <Gift className="h-3 w-3" />,
    color: "text-purple-700 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/30",
  },
};

export interface ImageData {
  id: string;
  url: string;
  thumbUrl: string | null;
  order: number;
}

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
  images?: ImageData[];
}

// ---------------------------------------------------------------------------
// IMAGE CAROUSEL
// ---------------------------------------------------------------------------

function ImageCarousel({ images, title }: { images: ImageData[]; title: string }) {
  const [current, setCurrent] = useState(0);

  if (images.length === 0) return null;

  const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));

  return (
    <div className="relative h-44 w-full overflow-hidden group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[current].url}
        alt={`${title} - ${current + 1}`}
        className="h-full w-full object-cover transition-opacity duration-200"
      />

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === current
                    ? "w-4 bg-white"
                    : "w-1.5 bg-white/50 hover:bg-white/70"
                )}
              />
            ))}
          </div>

          {/* Counter */}
          <span className="absolute top-2 right-2 bg-black/50 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md">
            {current + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LISTING CARD
// ---------------------------------------------------------------------------

interface ListingCardProps {
  listing: ListingData;
  isOwner?: boolean;
  onRemoved?: () => void;
  onContact?: (listing: ListingData) => void;
}

export function ListingCard({ listing, isOwner, onRemoved, onContact }: ListingCardProps) {
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

  // Use images array or fallback to single imageUrl
  const allImages: ImageData[] =
    listing.images && listing.images.length > 0
      ? listing.images
      : listing.imageUrl
        ? [{ id: "cover", url: listing.imageUrl, thumbUrl: null, order: 0 }]
        : [];

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card shadow-sm overflow-hidden",
        !listing.isActive
          ? "opacity-60 border-border"
          : "border-border",
      )}
    >
      {/* Image carousel */}
      {allImages.length > 0 && (
        <ImageCarousel images={allImages} title={listing.title} />
      )}

      <div className="p-4 space-y-2.5">
        {/* Category badge + price */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              meta.bg,
              meta.color,
            )}
          >
            {meta.icon}
            {meta.label}
          </span>
          {listing.price && (
            <span className="text-sm font-bold text-foreground">
              {listing.price}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-foreground">
          {listing.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-foreground-secondary line-clamp-3 whitespace-pre-line">
          {listing.description}
        </p>

        {/* Author + time */}
        <div className="flex items-center justify-between border-t border-border pt-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-background-secondary">
              {listing.author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listing.author.avatarUrl}
                  alt=""
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <User className="h-3.5 w-3.5 text-foreground-muted" />
              )}
            </div>
            <div className="text-[11px]">
              <span className="font-medium text-foreground">
                {listing.author.name}
              </span>
              {listing.author.department && (
                <span className="text-foreground-muted">
                  {" "}
                  · {listing.author.department.name}
                </span>
              )}
            </div>
          </div>
          <span className="text-[11px] text-foreground-muted">{timeAgo}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {/* Contact button (non-owners) */}
          {!isOwner && listing.isActive && onContact && (
            <button
              onClick={() => onContact(listing)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2",
                "border border-blue-200 dark:border-blue-800 text-xs font-medium text-blue-600 dark:text-blue-400",
                "hover:bg-blue-50 dark:hover:bg-blue-900/30 active:scale-[0.98] transition-all",
              )}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Napsat
            </button>
          )}

          {/* Owner: deactivate button */}
          {isOwner && listing.isActive && (
            <button
              onClick={handleDeactivate}
              disabled={isPending}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2",
                "border border-red-200 dark:border-red-800 text-xs font-medium text-red-600 dark:text-red-400",
                "hover:bg-red-50 dark:hover:bg-red-900/30 active:scale-[0.98] transition-all",
                "disabled:opacity-50",
              )}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isPending ? "Odstraňuji..." : "Stáhnout inzerát"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MARKETPLACE FEED (with search + sorting)
// ---------------------------------------------------------------------------

interface MarketplaceFeedProps {
  listings: ListingData[];
  currentUserId?: string;
  onContact?: (listing: ListingData) => void;
}

export function MarketplaceFeed({
  listings,
  currentUserId,
  onContact,
}: MarketplaceFeedProps) {
  const [filter, setFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("newest");

  const tabs = [
    { key: "ALL", label: "Vše", icon: <Package className="h-3.5 w-3.5" /> },
    { key: "SELLING", label: "Prodám", icon: <Tag className="h-3.5 w-3.5" /> },
    { key: "BUYING", label: "Koupím", icon: <ShoppingBag className="h-3.5 w-3.5" /> },
    { key: "LOOKING_FOR", label: "Hledám", icon: <Search className="h-3.5 w-3.5" /> },
    { key: "OFFERING", label: "Nabízím", icon: <Gift className="h-3.5 w-3.5" /> },
  ];

  // Client-side filtering (already fetched on server, but filter/search locally for instant UX)
  let filtered = filter === "ALL" ? listings : listings.filter((l) => l.category === filter);

  // Local search
  if (searchTerm.trim()) {
    const term = searchTerm.trim().toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.title.toLowerCase().includes(term) ||
        l.description.toLowerCase().includes(term),
    );
  }

  // Local sort
  filtered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "newest":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Hledat v inzerátech..."
          className={cn(
            "w-full rounded-xl border border-border pl-9 pr-3 py-2.5 text-sm",
            "bg-card text-foreground",
            "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
            "placeholder:text-foreground-muted",
          )}
        />
      </div>

      {/* Category filter tabs + sort */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1 -mx-1 px-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all active:scale-95",
                filter === tab.key
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                  : "bg-card border border-border text-foreground-secondary hover:bg-background-secondary",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="relative flex-shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={cn(
              "appearance-none rounded-xl border border-border pl-7 pr-3 py-1.5",
              "text-xs font-medium bg-card text-foreground-secondary",
              "focus:outline-none focus:ring-2 focus:ring-accent/20",
            )}
          >
            <option value="newest">Nejnovější</option>
            <option value="oldest">Nejstarší</option>
          </select>
          <ArrowUpDown className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <HandHelping className="mb-3 h-12 w-12 text-foreground-muted" />
          <p className="text-sm font-medium text-foreground-secondary">
            {searchTerm
              ? "Žádné výsledky pro hledaný výraz"
              : "Žádné inzeráty v této kategorii"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isOwner={currentUserId === listing.author.id}
              onContact={onContact}
            />
          ))}
        </div>
      )}
    </div>
  );
}
