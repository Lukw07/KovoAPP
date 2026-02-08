"use client";

// ============================================================================
// ReservationsClient — client-side orchestrator for the reservation flow
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import ResourceList from "@/components/reservations/resource-list";
import BookingTimeline from "@/components/reservations/booking-timeline";
import BookingForm from "@/components/reservations/booking-form";
import { getResourceReservations } from "@/actions/reservation-queries";
import { addDays, startOfDay } from "date-fns";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Resource = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  location: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  metadata: unknown;
};

type TimelineReservation = {
  id: string;
  startTime: Date | string;
  endTime: Date | string;
  status: string;
  user: { id: string; name: string; avatarUrl: string | null };
};

interface ReservationsClientProps {
  resources: Resource[];
}

export default function ReservationsClient({
  resources,
}: ReservationsClientProps) {
  const [selected, setSelected] = useState<Resource | null>(null);
  const [dateOffset, setDateOffset] = useState(0); // 0 = today
  const [todayReservations, setTodayReservations] = useState<
    TimelineReservation[]
  >([]);
  const [tomorrowReservations, setTomorrowReservations] = useState<
    TimelineReservation[]
  >([]);
  const [loading, setLoading] = useState(false);

  const today = startOfDay(addDays(new Date(), dateOffset));
  const tomorrow = addDays(today, 1);

  // Fetch reservations when resource or date changes
  const fetchTimeline = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const [todayRes, tomorrowRes] = await Promise.all([
        getResourceReservations(selected.id, today, 1),
        getResourceReservations(selected.id, tomorrow, 1),
      ]);
      setTodayReservations(todayRes);
      setTomorrowReservations(tomorrowRes);
    } finally {
      setLoading(false);
    }
  }, [selected, dateOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // ---- List view (no resource selected) ----
  if (!selected) {
    return (
      <ResourceList
        resources={resources}
        onSelect={(r) => setSelected(r)}
      />
    );
  }

  // ---- Detail view (resource selected) ----
  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        type="button"
        onClick={() => {
          setSelected(null);
          setDateOffset(0);
        }}
        className="flex items-center gap-2 text-sm font-medium text-foreground-secondary active:scale-95 transition-transform"
      >
        <ArrowLeft className="h-4 w-4" />
        Zpět na seznam
      </button>

      {/* Date navigator */}
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setDateOffset((o) => o - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-background-secondary text-foreground-secondary active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setDateOffset(0)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            dateOffset === 0
              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
              : "bg-background-secondary text-foreground-secondary",
          )}
        >
          Dnes
        </button>
        <button
          type="button"
          onClick={() => setDateOffset((o) => o + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-background-secondary text-foreground-secondary active:scale-95"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Loading overlay */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
        </div>
      ) : (
        <>
          {/* Today timeline */}
          <BookingTimeline
            reservations={todayReservations}
            date={today}
            resourceName={selected.name}
          />

          {/* Tomorrow timeline */}
          <BookingTimeline
            reservations={tomorrowReservations}
            date={tomorrow}
            resourceName={selected.name}
          />
        </>
      )}

      {/* Booking form */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <BookingForm
          resourceId={selected.id}
          resourceName={selected.name}
          onSuccess={() => fetchTimeline()}
        />
      </div>
    </div>
  );
}
