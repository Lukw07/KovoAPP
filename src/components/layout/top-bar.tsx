"use client";

import { Star, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Session } from "next-auth";

interface TopBarProps {
  user: Session["user"] | null;
  onMenuClick: () => void;
}

export function TopBar({ user, onMenuClick }: TopBarProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Left: Avatar + Name */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            aria-label="Otevřít menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700"
          >
            <Menu className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </button>

          {user && (
            <div className="flex items-center gap-2.5">
              {/* Avatar */}
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white",
                  "bg-gradient-to-br from-blue-500 to-blue-700",
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

              {/* Name + Role badge */}
              <div className="hidden min-[380px]:block">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                  {user.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {roleLabel(user.role)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Points Balance */}
        {user && (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 border border-amber-200 dark:border-amber-700">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-bold text-amber-700">
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
