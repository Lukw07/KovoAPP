"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Car, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/generated/prisma/enums";

const NAV_ITEMS = [
  {
    label: "Přehled",
    href: "/dashboard",
    icon: LayoutDashboard,
    matchPrefix: "/dashboard",
  },
  {
    label: "Žádosti",
    href: "/requests",
    icon: CalendarDays,
    matchPrefix: "/requests",
  },
  {
    label: "Rezervace",
    href: "/reservations",
    icon: Car,
    matchPrefix: "/reservations",
  },
  {
    label: "Více",
    href: "/more",
    icon: MoreHorizontal,
    matchPrefix: "/more",
  },
] as const;

interface BottomNavProps {
  userRole: Role;
}

export function BottomNav({ userRole: _userRole }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg safe-bottom">
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.matchPrefix);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 pb-2 pt-3 text-xs transition-colors",
                "active:bg-slate-100 dark:active:bg-slate-800",
                isActive
                  ? "text-blue-600 font-semibold"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
              )}
            >
              <Icon
                className={cn(
                  "h-6 w-6 transition-transform",
                  isActive && "scale-110",
                )}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area spacer for iOS home bar */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
