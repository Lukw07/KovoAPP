"use client";

// ============================================================================
// UpcomingItems — shows items awaiting the user on the dashboard
// ============================================================================

import { cn } from "@/lib/utils";
import {
  Car,
  CalendarDots,
  ShieldCheck,
} from "@phosphor-icons/react";

interface UpcomingItem {
  id: string;
  type: "reservation" | "hr_request" | "pending_approval";
  title: string;
  description: string;
  link: string;
  date: Date;
  status: string;
}

const TYPE_CONFIG: Record<
  string,
  {
    icon: typeof Car;
    color: string;
    bg: string;
  }
> = {
  reservation: {
    icon: Car,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/30",
  },
  hr_request: {
    icon: CalendarDots,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
  },
  pending_approval: {
    icon: ShieldCheck,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/30",
  },
};

export function UpcomingItems({ items }: { items: UpcomingItem[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground-secondary uppercase">
        Čeká na mě
      </h2>
      <div className="space-y-2">
        {items.map((item) => {
          const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.reservation;
          const Icon = cfg.icon;

          return (
            <a
              key={item.id}
              href={item.link}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm transition-colors hover:bg-card-hover active:scale-[0.98]"
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  cfg.bg,
                )}
              >
                <Icon className={cn("h-4 w-4", cfg.color)} weight="duotone" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">
                  {item.title}
                </p>
                <p className="text-xs text-foreground-muted truncate">
                  {item.description}
                </p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
