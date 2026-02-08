"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light", label: "Světlý", icon: Sun },
  { value: "dark", label: "Tmavý", icon: Moon },
  { value: "system", label: "Systém", icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch — render only after mount
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <div className="h-6 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-4 flex gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 flex-1 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up stagger-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Vzhled
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Aktuálně:{" "}
            <span className="font-medium">
              {resolvedTheme === "dark" ? "Tmavý režim" : "Světlý režim"}
            </span>
          </p>
        </div>

        {/* Animated icon showing current resolved theme */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
          {resolvedTheme === "dark" ? (
            <Moon className="h-5 w-5 text-blue-400" />
          ) : (
            <Sun className="h-5 w-5 text-amber-500" />
          )}
        </div>
      </div>

      {/* 3-way segmented control */}
      <div className="flex gap-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 p-1">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
          const isActive = theme === value;

          return (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg py-2.5 text-xs font-medium transition-all duration-300",
                isActive
                  ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-md"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
              )}
              aria-pressed={isActive}
            >
              <Icon className="h-4.5 w-4.5" strokeWidth={isActive ? 2.25 : 1.75} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
