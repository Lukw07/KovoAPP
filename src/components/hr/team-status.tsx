// ============================================================================
// TeamStatus — "Who is absent today" widget (server component)
// ============================================================================

import { getAbsentToday } from "@/actions/hr-queries";
import { cn } from "@/lib/utils";
import { UserX, Palmtree, Stethoscope, Home, Coffee } from "lucide-react";

const TYPE_ICONS: Record<string, { icon: typeof Palmtree; label: string; color: string }> = {
  VACATION: { icon: Palmtree, label: "Dovolená", color: "text-blue-500" },
  SICK_DAY: { icon: Coffee, label: "Sick day", color: "text-amber-500" },
  DOCTOR: { icon: Stethoscope, label: "Lékař", color: "text-rose-500" },
  PERSONAL_DAY: { icon: UserX, label: "Osobní volno", color: "text-violet-500" },
  HOME_OFFICE: { icon: Home, label: "Home Office", color: "text-emerald-500" },
};

interface TeamStatusProps {
  className?: string;
}

export default async function TeamStatus({ className }: TeamStatusProps) {
  const absentList = await getAbsentToday();

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5",
        className,
      )}
    >
      <h2 className="mb-3 text-base font-semibold text-foreground">
        Kdo dnes chybí
      </h2>

      {absentList.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="mb-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 p-3">
            <UserX className="h-6 w-6 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-foreground-secondary">
            Dnes jsou všichni přítomni 🎉
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {absentList.map((entry) => {
            const cfg = TYPE_ICONS[entry.type] ?? TYPE_ICONS.VACATION;
            const Icon = cfg.icon;

            return (
              <li
                key={entry.id}
                className="flex items-center gap-3 rounded-xl bg-background-secondary px-3 py-2.5"
              >
                {/* Avatar placeholder */}
                {entry.user.avatarUrl ? (
                  <img
                    src={entry.user.avatarUrl}
                    alt={entry.user.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-border text-xs font-bold text-foreground-secondary">
                    {entry.user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {entry.user.name}
                  </p>
                  {entry.user.position && (
                    <p className="truncate text-xs text-foreground-muted">
                      {entry.user.position}
                    </p>
                  )}
                </div>

                {/* Badge */}
                <div
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium",
                    cfg.color,
                    "bg-background-secondary",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{cfg.label}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
