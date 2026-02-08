"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  CalendarDots,
  Car,
  DotsThree,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { Role } from "@/generated/prisma/enums";

const NAV_ITEMS = [
  {
    label: "Přehled",
    href: "/dashboard",
    icon: SquaresFour,
    matchPrefix: "/dashboard",
  },
  {
    label: "Žádosti",
    href: "/requests",
    icon: CalendarDots,
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
    icon: DotsThree,
    matchPrefix: "/more",
  },
] as const;

interface BottomNavProps {
  userRole: Role;
}

export function BottomNav({ userRole: _userRole }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t glass-nav safe-bottom">
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.matchPrefix);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 pb-2 pt-3 text-xs",
                "transition-colors duration-100",
                "active:bg-background-secondary",
                isActive
                  ? "text-accent font-semibold"
                  : "text-foreground-muted hover:text-foreground-secondary",
              )}
            >
              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute top-1 h-1 w-1 rounded-full bg-accent animate-fade-in-scale" />
              )}

              {/* Phosphor icon: outline → fill on active */}
              <Icon
                className={cn(
                  "h-6 w-6 transition-transform duration-150",
                  isActive && "scale-110",
                )}
                weight={isActive ? "fill" : "regular"}
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
