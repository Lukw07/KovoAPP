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
  ChartBar,
  Gift,
  GearSix,
  SignOut,
  Star,
  ClipboardText,
  ChatCircle,
  Storefront,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/(auth)/actions";
import type { Session } from "next-auth";
import type { IconWeight } from "@phosphor-icons/react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  user: Session["user"] | null;
}

// Drawer menu items — using Phosphor icons with weight switching
const MENU_SECTIONS = [
  {
    title: "Komunikace",
    items: [
      { label: "Novinky", href: "/news", icon: Newspaper },
      { label: "Ankety", href: "/polls", icon: ChartBar },
      { label: "Zprávy", href: "/messages", icon: ChatCircle },
    ],
  },
  {
    title: "Gamifikace",
    items: [{ label: "Odměny", href: "/rewards", icon: Gift }],
  },
  {
    title: "Kariéra & Tržiště",
    items: [
      { label: "Volné pozice", href: "/jobs", icon: Briefcase },
      { label: "Tržiště", href: "/marketplace", icon: Storefront },
    ],
  },
  {
    title: "Účet",
    items: [
      { label: "Profil", href: "/profile", icon: User },
      { label: "Nastavení", href: "/settings", icon: GearSix },
    ],
  },
] as const;

const ADMIN_SECTION = {
  title: "Správa",
  items: [
    { label: "Admin panel", href: "/admin", icon: ShieldCheck },
  ],
} as const;

const MANAGER_SECTION = {
  title: "Správa",
  items: [
    { label: "Správa systému", href: "/admin", icon: ClipboardText },
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

  const managementSection =
    user?.role === "ADMIN"
      ? ADMIN_SECTION
      : user?.role === "MANAGER"
        ? MANAGER_SECTION
        : null;

  const sections = managementSection
    ? [managementSection, ...MENU_SECTIONS]
    : [...MENU_SECTIONS];

  return (
    <>
      {/* Backdrop — blur overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel — premium glass surface */}
      <div
        ref={drawerRef}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] flex-col",
          "bg-card dark:bg-background-secondary",
          "shadow-2xl dark:shadow-[0_0_60px_rgba(0,0,0,0.8)]",
          "transition-transform duration-300 ease-[cubic-bezier(0.4,0.14,0.3,1)]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Boční menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-5">
          {user && (
            <div className="flex items-center gap-3">
              {/* Avatar with brand gradient */}
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-violet-600 text-base font-bold text-white shadow-[0_2px_12px_rgba(99,102,241,0.35)]">
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
                <p className="font-semibold tracking-tight text-foreground">{user.name}</p>
                <div className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                  <Star className="h-3.5 w-3.5 text-amber-400" weight="fill" />
                  <span className="font-medium tabular-nums">{user.pointsBalance} bodů</span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground-muted hover:bg-background-secondary dark:hover:bg-background-tertiary active:scale-[0.95] btn-press focus-ring"
            aria-label="Zavřít menu"
          >
            <X className="h-5 w-5" weight="bold" />
          </button>
        </div>

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <div key={section.title} className="mb-5">
              {/* Section label — premium uppercase tracking */}
              <p className="mb-1.5 px-3 label-caps">
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
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-100",
                      "active:scale-[0.98] btn-press",
                      isActive
                        ? "bg-accent-light text-accent-text inner-glow"
                        : "text-foreground-secondary hover:bg-background-secondary dark:hover:bg-background-tertiary",
                    )}
                  >
                    {/* Phosphor: outline → fill on active */}
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        isActive ? "text-accent" : "text-foreground-muted",
                      )}
                      weight={isActive ? "fill" : "regular"}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer: Logout */}
        <div className="border-t border-border p-3">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 transition-all duration-100 hover:bg-red-50 dark:hover:bg-red-900/15 active:scale-[0.98] btn-press"
            >
              <SignOut className="h-5 w-5" weight="bold" />
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
