import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Use "text" for line-height-matched text blocks, "circle" for avatars */
  variant?: "default" | "text" | "circle";
}

export function Skeleton({
  className,
  variant = "default",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-background-secondary",
        variant === "text" && "h-4 rounded",
        variant === "circle" && "aspect-square rounded-full",
        className,
      )}
      {...props}
    >
      {/* Premium 45° shimmer sweep */}
      <div className="absolute inset-0 animate-shimmer" />
    </div>
  );
}

/** Pre-built skeleton for cards */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 space-y-3 inner-glow",
        className,
      )}
    >
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton variant="text" className="h-5 w-3/4" />
      <Skeleton variant="text" className="h-4 w-1/2" />
      <div className="flex items-center gap-2 pt-2">
        <Skeleton variant="circle" className="h-7 w-7" />
        <Skeleton variant="text" className="h-3 w-24" />
      </div>
    </div>
  );
}

/** Pre-built skeleton for list rows */
export function SkeletonList({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 inner-glow"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <Skeleton variant="circle" className="h-10 w-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-4 w-2/3" />
            <Skeleton variant="text" className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
