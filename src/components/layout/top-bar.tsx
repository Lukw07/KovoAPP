"use client";

import { Star, MagnifyingGlass } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { Session } from "next-auth";
import { NotificationBell } from "@/components/notifications/notification-bell";

interface TopBarProps {
  user: Session["user"] | null;
  onSearchClick?: () => void;
}

export function TopBar({ user, onSearchClick }: TopBarProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b glass-nav">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Left: Logo + User Name */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold">
            K
          </div>

          {user && (
            <div className="flex items-center gap-2.5">
              {/* Avatar */}
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white",
                  "bg-blue-600",
                )}
              >
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

              {/* Name + Role */}
              <div className="hidden min-[380px]:block">
                <p className="text-sm font-semibold tracking-tight text-foreground leading-tight">
                  {user.name}
                </p>
                <p className="text-[11px] text-foreground-muted">
                  {roleLabel(user.role)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Search + Points Balance */}
        <div className="flex items-center gap-2">
          {onSearchClick && (
            <button
              onClick={onSearchClick}
              aria-label="Vyhledávání"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-background-secondary hover:bg-background-tertiary active:scale-[0.97] btn-press focus-ring"
            >
              <MagnifyingGlass
                className="h-4.5 w-4.5 text-foreground-secondary"
                weight="bold"
              />
            </button>
          )}

          <NotificationBell />

          {user && (
            <div className="flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 border border-blue-200/60 dark:border-blue-700/40">
              <Star className="h-4 w-4 text-blue-500 dark:text-blue-400" weight="fill" />
              <span className="text-sm font-bold tabular-nums text-blue-700 dark:text-blue-300">
                {user.pointsBalance}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
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

function roleLabel(role: string): string {
  switch (role) {
    case "ADMIN":
      return "Administrátor";
    case "MANAGER":
      return "Vedoucí";
    case "EMPLOYEE":
      return "Zaměstnanec";
    default:
      return role;
  }
}
