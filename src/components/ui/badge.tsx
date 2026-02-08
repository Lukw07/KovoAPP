import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────
   Premium Badge / Chip
   - Semantic variants with subtle backgrounds
   - 8pt grid sizing
   ──────────────────────────────────────────────────────────────── */

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "accent" | "success" | "warning" | "danger";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "sm",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold",

        // Sizes
        size === "sm" && "px-2 py-0.5 text-[11px]",
        size === "md" && "px-2.5 py-1 text-xs",

        // Variants
        variant === "default" &&
          "bg-background-secondary text-foreground-secondary",
        variant === "accent" && "bg-accent-light text-accent-text",
        variant === "success" && "bg-success-light text-success",
        variant === "warning" && "bg-warning-light text-warning",
        variant === "danger" && "bg-danger-light text-danger",

        className,
      )}
      {...props}
    />
  );
}
