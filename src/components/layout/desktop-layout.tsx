"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname     } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  SquaresFour,
  CalendarDots,
  ChatCircle,
  Newspaper,
  ChartBar,
  Gift,
  Briefcase,
  Storefront,
  User,
  GearSix,
  ShieldCheck,
  ClipboardText,
  SignOut,
  Star,
  MagnifyingGlass,
  CaretLeft,
  CaretRight,
  Users,
  Calendar,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/(auth)/actions";
import { NotificationPrompt } from "@/components/notifications/notification-prompt";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { SearchModal } from "@/components/ui/search-modal";
import { PwaInstallPrompt } from "@/components/notifications/pwa-install-prompt";

// ============================================================================
// Desktop-first layout — persistent sidebar, no bottom nav
// ============================================================================

const NAV_SECTIONS = [
  {
    title: "Hlavní",
    items: [
      { label: "Přehled", href: "/dashboard", icon: SquaresFour },
      { label: "Žádosti", href: "/requests", icon: CalendarDots },
      { label: "Kalendář", href: "/calendar", icon: Calendar },
      { label: "Zprávy", href: "/messages", icon: ChatCircle },
    ],
  },
  {
    title: "Komunikace",
    items: [
      { label: "Novinky", href: "/news", icon: Newspaper },
      { label: "Ankety", href: "/polls", icon: ChartBar },
    ],
  },
  {
    title: "Gamifikace & Kariéra",
    items: [
      { label: "Odměny", href: "/rewards", icon: Gift },
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
];

const MANAGER_NAV = {
  title: "Správa",
  items: [
    { label: "Admin panel", href: "/admin", icon: ShieldCheck },
    { label: "Zaměstnanci", href: "/admin/employees", icon: Users },
  ],
};

const ADMIN_NAV = {
  title: "Správa",
  items: [
    { label: "Admin panel", href: "/admin", icon: ShieldCheck },
    { label: "Zaměstnanci", href: "/admin/employees", icon: Users },
  ],
};

export function DesktopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const managementNav =
    user?.role === "ADMIN"
      ? ADMIN_NAV
      : user?.role === "MANAGER"
        ? MANAGER_NAV
        : null;

  const sections = managementNav
    ? [NAV_SECTIONS[0], managementNav, ...NAV_SECTIONS.slice(1)]
    : [...NAV_SECTIONS];

  return (
    <div className="flex h-dvh bg-background overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-card transition-all duration-200 shrink-0",
          collapsed ? "w-[68px]" : "w-[260px]",
        )}
      >
        {/* Logo / brand */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-accent text-white text-sm font-bold">
                K
              </div>
              <span className="text-base font-bold tracking-tight text-foreground">
                KOVO Apka
              </span>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-accent text-white text-sm font-bold">
              K
            </div>
          )}
        </div>

        {/* Search button */}
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={() => setSearchOpen(true)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground-muted transition-colors hover:bg-background-tertiary hover:text-foreground-secondary",
              collapsed && "justify-center px-0",
            )}
          >
            <MagnifyingGlass className="h-4 w-4 shrink-0" weight="bold" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Hledat…</span>
                <kbd className="hidden xl:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-background px-1.5 text-[10px] font-medium text-foreground-muted">
                  ⌘K
                </kbd>
              </>
            )}
          </button>
        </div>

        {/* Navigation sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {sections.map((section) => (
            <div key={section.title} className="mb-4">
              {!collapsed && (
                <p className="mb-1 px-3 label-caps">{section.title}</p>
              )}
              {collapsed && <div className="mb-1" />}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-100 mb-0.5",
                      collapsed && "justify-center px-0",
                      isActive
                        ? "bg-accent-light text-accent-text"
                        : "text-foreground-secondary hover:bg-background-secondary hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0",
                        isActive
                          ? "text-accent"
                          : "text-foreground-muted group-hover:text-foreground-secondary",
                      )}
                      weight={isActive ? "fill" : "regular"}
                    />
                    {!collapsed && item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-border p-3">
          {user && !collapsed && (
            <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-background-secondary px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shrink-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  user.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2) ?? "?"
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-foreground truncate">
                  {user.name}
                </p>
                <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <Star className="h-3 w-3" weight="fill" />
                  <span className="font-medium tabular-nums">
                    {user.pointsBalance}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1">
            <form action={logoutAction} className="flex-1">
              <button
                type="submit"
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/15 transition-colors",
                  collapsed && "justify-center px-0",
                )}
                title={collapsed ? "Odhlásit se" : undefined}
              >
                <SignOut className="h-[18px] w-[18px] shrink-0" weight="bold" />
                {!collapsed && "Odhlásit se"}
              </button>
            </form>

            <button
              onClick={() => setCollapsed((c) => !c)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted hover:bg-background-secondary hover:text-foreground-secondary transition-colors shrink-0"
              aria-label={collapsed ? "Rozbalit menu" : "Sbalit menu"}
            >
              {collapsed ? (
                <CaretRight className="h-4 w-4" />
              ) : (
                <CaretLeft className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content area ────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Thin top bar — breadcrumb / page context */}
        <header className="flex h-14 items-center border-b border-border bg-card px-6">
          <h1 className="text-sm font-semibold text-foreground tracking-tight">
            {getPageTitle(pathname)}
          </h1>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-6">
            <OfflineIndicator />
            <NotificationPrompt />
            <PwaInstallPrompt />
            {children}
          </div>
        </main>
      </div>

      {/* Search modal */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    "/dashboard": "Přehled",
    "/requests": "Žádosti o volno",
    "/requests/new": "Nová žádost",
    "/messages": "Zprávy",
    "/news": "Novinky",
    "/polls": "Ankety",
    "/rewards": "Odměny",
    "/jobs": "Volné pozice",
    "/marketplace": "Tržiště",
    "/profile": "Profil",
    "/settings": "Nastavení",
    "/admin": "Administrace",
    "/admin/employees": "Správa zaměstnanců",
    "/reservations": "Rezervace",
    "/more": "Další",
  };

  // Check exact match first, then prefix
  if (map[pathname]) return map[pathname];
  for (const [prefix, title] of Object.entries(map)) {
    if (pathname.startsWith(prefix)) return title;
  }
  return "KOVO Apka";
}
