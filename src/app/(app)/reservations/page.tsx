import { getResources, getMyReservations } from "@/actions/reservation-queries";
import ReservationsClient from "@/components/reservations/reservations-client";
import MyReservations from "@/components/reservations/my-reservations";

export const metadata = { title: "Rezervace" };

export default async function ReservationsPage() {
  const [resources, myReservations] = await Promise.all([
    getResources(),
    getMyReservations(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Rezervace zdrojů</h1>
        <p className="text-xs text-foreground-muted">
          Auta, zasedací místnosti, nástroje a parkování
        </p>
      </div>

      {/* Resource browser + timeline + booking */}
      <ReservationsClient resources={resources} />

      {/* My reservations list */}
      <MyReservations reservations={myReservations} />
    </div>
  );
}
