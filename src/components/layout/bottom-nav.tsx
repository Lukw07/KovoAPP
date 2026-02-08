"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  SquaresFour,
  CalendarDots,
  Car,
  DotsThree,
  ChatCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { getUnreadMessageCount } from "@/actions/messages";
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
    label: "Zprávy",
    href: "/messages",
    icon: ChatCircle,
    matchPrefix: "/messages",
    showBadge: true,
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
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread message count
  useEffect(() => {
    let mounted = true;
    async function fetchUnread() {
      try {
        const count = await getUnreadMessageCount();
        if (mounted) setUnreadCount(count);
      } catch {
        // ignore
      }
    }
    fetchUnread();
    // Poll every 30 seconds
    const interval = setInterval(fetchUnread, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [pathname]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t glass-nav pb-[env(safe-area-inset-bottom,0px)]" aria-label="Hlavní navigace">
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.matchPrefix);
          const Icon = item.icon;
          const showBadge = "showBadge" in item && item.showBadge && unreadCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
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
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    layoutId="bottomNavIndicator"
                    className="absolute top-1 h-1 w-1 rounded-full bg-accent"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  />
                )}
              </AnimatePresence>

              {/* Icon with optional badge */}
              <span className="relative">
                <motion.span
                  animate={{
                    scale: isActive ? 1.1 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="inline-block"
                >
                  <Icon
                    className="h-6 w-6"
                    weight={isActive ? "fill" : "regular"}
                  />
                </motion.span>
                {/* Unread badge */}
                <AnimatePresence>
                  {showBadge && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
