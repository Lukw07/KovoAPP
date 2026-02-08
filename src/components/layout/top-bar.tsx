"use client";

import { List, Star } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { Session } from "next-auth";

interface TopBarProps {
  user: Session["user"] | null;
  onMenuClick: () => void;
}

export function TopBar({ user, onMenuClick }: TopBarProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b glass-nav">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Left: Menu + Avatar + Name */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            aria-label="Otevřít menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-background-secondary hover:bg-background-tertiary active:scale-[0.97] btn-press focus-ring"
          >
            <List className="h-5 w-5 text-foreground-secondary" weight="bold" />
          </button>

          {user && (
            <div className="flex items-center gap-2.5">
              {/* Avatar with brand gradient */}
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white",
                  "bg-linear-to-br from-indigo-500 to-violet-600",
                  "shadow-[0_2px_8px_rgba(99,102,241,0.3)]",
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

              {/* Name + Role — tight heading typography */}
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

        {/* Right: Points Balance — monospace for numbers */}
        {user && (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 border border-amber-200/60 dark:border-amber-700/40 inner-glow">
            <Star className="h-4 w-4 text-amber-400" weight="fill" />
            <span className="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">
              {user.pointsBalance}
            </span>
          </div>
        )}
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
