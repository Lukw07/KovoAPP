import { getResources, getMyReservations, getPendingReservations } from "@/actions/reservation-queries";
import { auth } from "@/lib/auth";
import ReservationsClient from "@/components/reservations/reservations-client";
import MyReservations from "@/components/reservations/my-reservations";
import PendingApprovals from "@/components/reservations/pending-approvals";
import { CalendarCheck } from "lucide-react";

export const metadata = { title: "Rezervace" };

export default async function ReservationsPage() {
  const session = await auth();
  const isManagement =
    session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER";

  const [resources, myReservations, pendingReservations] = await Promise.all([
    getResources(),
    getMyReservations(),
    isManagement ? getPendingReservations() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
          <CalendarCheck className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Rezervace</h1>
          <p className="text-xs text-foreground-muted">
            Auta, zasedací místnosti, nástroje a parkování
          </p>
        </div>
      </div>

      {/* Pending approvals for managers/admins */}
      {isManagement && <PendingApprovals reservations={pendingReservations} />}

      {/* Resource browser + timeline + booking */}
      <ReservationsClient resources={resources} />

      {/* My reservations list */}
      <MyReservations reservations={myReservations} />
    </div>
  );
}
