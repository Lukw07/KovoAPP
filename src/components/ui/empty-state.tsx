import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center inner-glow",
        className,
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-background-secondary inner-glow">
        <Icon className="h-8 w-8 text-foreground-muted" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-semibold tracking-tight text-foreground-secondary">
        {title}
      </p>
      {description && (
        <p className="mt-1.5 max-w-xs text-xs text-foreground-muted leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
