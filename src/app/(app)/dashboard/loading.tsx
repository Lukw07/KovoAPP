import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Hero skeleton — matching the gradient hero height */}
      <div className="relative overflow-hidden rounded-2xl bg-blue-600/80 p-5 sm:p-6">
        {/* Date row */}
        <Skeleton className="h-4 w-32 bg-white/15 rounded-md mb-4" />

        {/* Avatar + greeting */}
        <div className="flex items-start gap-4">
          <Skeleton className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-white/15 shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-4 w-24 bg-white/15 rounded-md" />
            <Skeleton className="h-8 w-44 bg-white/15 rounded-md" />
          </div>
        </div>

        {/* Stat pills */}
        <div className="flex gap-2.5 mt-5">
          <Skeleton className="h-9 w-28 bg-white/15 rounded-xl" />
          <Skeleton className="h-9 w-24 bg-white/15 rounded-xl" />
        </div>

        {/* News slots */}
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3 w-28 bg-white/10 rounded-md" />
          <Skeleton className="h-11 w-full bg-white/10 rounded-xl" />
          <Skeleton className="h-11 w-full bg-white/10 rounded-xl" />
        </div>
      </div>

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
