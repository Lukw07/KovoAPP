"use client";

// ============================================================================
// ResourceList — filterable list of resources with type tabs
// ============================================================================

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Car,
  DoorOpen,
  Wrench,
  CircleParking,
  ChevronRight,
  MapPin,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types & config
// ---------------------------------------------------------------------------

type Resource = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  location: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  metadata: unknown;
};

const RESOURCE_TABS = [
  { value: "ALL", label: "Vše", icon: null },
  { value: "CAR", label: "Auta", icon: Car },
  { value: "ROOM", label: "Místnosti", icon: DoorOpen },
  { value: "TOOL", label: "Nástroje", icon: Wrench },
  { value: "PARKING_SPOT", label: "Parkování", icon: CircleParking },
] as const;

const TYPE_META: Record<
  string,
  { icon: typeof Car; color: string; bg: string; label: string }
> = {
  CAR: { icon: Car, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30", label: "Auto" },
  ROOM: {
    icon: DoorOpen,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    label: "Místnost",
  },
  TOOL: {
    icon: Wrench,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    label: "Nástroj",
  },
  PARKING_SPOT: {
    icon: CircleParking,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/30",
    label: "Parkování",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ResourceListProps {
  resources: Resource[];
  selectedId?: string;
  onSelect: (resource: Resource) => void;
  className?: string;
}

export default function ResourceList({
  resources,
  selectedId,
  onSelect,
  className,
}: ResourceListProps) {
  const [filter, setFilter] = useState<string>("ALL");

  const filtered =
    filter === "ALL" ? resources : resources.filter((r) => r.type === filter);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Filter tabs — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {RESOURCE_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all active:scale-95",
                filter === tab.value
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700",
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Resource cards */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          Žádné zdroje v této kategorii
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((res) => {
            const meta = TYPE_META[res.type] ?? TYPE_META.TOOL;
            const Icon = meta.icon;
            const isSelected = res.id === selectedId;

            return (
              <li key={res.id}>
                <button
                  type="button"
                  onClick={() => onSelect(res)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98]",
                    isSelected
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-sm shadow-blue-600/10"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600",
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      meta.bg,
                    )}
                  >
                    <Icon className={cn("h-5 w-5", meta.color)} />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {res.name}
                    </p>
                    {res.location && (
                      <p className="flex items-center gap-1 truncate text-xs text-slate-400">
                        <MapPin className="h-3 w-3" />
                        {res.location}
                      </p>
                    )}
                    {res.description && (
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {res.description}
                      </p>
                    )}
                  </div>

                  {/* Availability dot + chevron */}
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        res.isAvailable ? "bg-emerald-500" : "bg-red-500",
                      )}
                      title={res.isAvailable ? "Dostupné" : "Nedostupné"}
                    />
                    <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
