import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Welcome card skeleton */}
      <Skeleton className="h-40 w-full rounded-2xl" />

      {/* Quick action grid */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>

      {/* Calendar skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>

      {/* Team status skeleton */}
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}
