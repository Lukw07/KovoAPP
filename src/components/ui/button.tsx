import { cn } from "@/lib/utils";
import { forwardRef } from "react";

/* ────────────────────────────────────────────────────────────────
   Premium Button System
   - Colored glow shadows (accent color bleeds into shadow)
   - Active press feedback (scale 0.98)
   - Productive motion curve (100ms)
   ──────────────────────────────────────────────────────────────── */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Base
          "inline-flex items-center justify-center gap-2 font-semibold",
          "rounded-xl transition-all",
          "btn-press focus-ring",
          "disabled:pointer-events-none disabled:opacity-50",

          // Sizes — 8pt grid
          size === "sm" && "h-8 px-3 text-xs",
          size === "md" && "h-10 px-4 text-sm",
          size === "lg" && "h-12 px-6 text-sm",

          // Variants
          variant === "primary" && [
            "bg-accent text-white",
            "shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_var(--accent-glow)]",
            "hover:bg-accent-hover hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_6px_20px_var(--accent-glow)]",
          ],
          variant === "secondary" && [
            "bg-background-secondary text-foreground border border-border",
            "hover:bg-background-tertiary hover:border-border-strong",
          ],
          variant === "ghost" && [
            "text-foreground-secondary",
            "hover:bg-background-secondary hover:text-foreground",
          ],
          variant === "danger" && [
            "bg-danger text-white",
            "shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(220,38,38,0.3)]",
            "hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_6px_20px_rgba(220,38,38,0.4)]",
          ],

          className,
        )}
        {...props}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
