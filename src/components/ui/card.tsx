import { cn } from "@/lib/utils";
import { forwardRef } from "react";

/* ────────────────────────────────────────────────────────────────
   Premium Card System
   - Layered shadows (light) / inner-glow + accent glow (dark)
   - 8pt grid compliant padding
   - Variants: default, glass, interactive
   ──────────────────────────────────────────────────────────────── */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** "default" — solid surface. "glass" — glassmorphism. "interactive" — hover lift. */
  variant?: "default" | "glass" | "interactive";
  /** Remove default padding */
  noPadding?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", noPadding = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border border-border",
          !noPadding && "p-4",

          // Default: solid card with layered shadow
          variant === "default" && "premium-card",

          // Glass: glassmorphism 2.0
          variant === "glass" && "glass-card",

          // Interactive: lift on hover with glow
          variant === "interactive" &&
            "premium-card card-hover cursor-pointer active:scale-[0.98] btn-press",

          className,
        )}
        {...props}
      />
    );
  },
);
Card.displayName = "Card";

/* ── Card sub-components for structured layouts ────────────────── */

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between pb-3", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-base font-semibold tracking-tight text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function CardLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("label-caps", className)} {...props} />;
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-3", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-t border-border pt-3 mt-3",
        className,
      )}
      {...props}
    />
  );
}
