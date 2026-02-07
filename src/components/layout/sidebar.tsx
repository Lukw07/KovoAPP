"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  User,
  Briefcase,
  ShieldCheck,
  Newspaper,
  BarChart3,
  Gift,
  Settings,
  LogOut,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/(auth)/actions";
import type { Session } from "next-auth";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  user: Session["user"] | null;
}

// Drawer menu items
const MENU_SECTIONS = [
  {
    title: "Komunikace",
    items: [
      { label: "Novinky", href: "/news", icon: Newspaper },
      { label: "Ankety", href: "/polls", icon: BarChart3 },
    ],
  },
  {
    title: "Gamifikace",
    items: [{ label: "Odměny", href: "/rewards", icon: Gift }],
  },
  {
    title: "Kariéra",
    items: [
      { label: "Volné pozice", href: "/jobs", icon: Briefcase },
    ],
  },
  {
    title: "Účet",
    items: [
      { label: "Profil", href: "/profile", icon: User },
      { label: "Nastavení", href: "/settings", icon: Settings },
    ],
  },
] as const;

const ADMIN_SECTION = {
  title: "Správa",
  items: [
    { label: "Admin panel", href: "/admin", icon: ShieldCheck },
  ],
} as const;

export function Sidebar({ open, onClose, user }: SidebarProps) {
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on navigation
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent background scroll
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const sections =
    user?.role === "ADMIN"
      ? [ADMIN_SECTION, ...MENU_SECTIONS]
      : [...MENU_SECTIONS];

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] flex-col bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Boční menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-5">
          {user && (
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-base font-bold text-white">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name ?? ""}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  getInitials(user.name)
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{user.name}</p>
                <div className="flex items-center gap-1 text-sm text-amber-600">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{user.pointsBalance} bodů</span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700"
            aria-label="Zavřít menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {section.title}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                    "active:bg-slate-100 dark:active:bg-slate-800",
                    isActive
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500",
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer: Logout */}
        <div className="border-t border-slate-100 dark:border-slate-800 p-3">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30"
            >
              <LogOut className="h-5 w-5" />
              Odhlásit se
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
