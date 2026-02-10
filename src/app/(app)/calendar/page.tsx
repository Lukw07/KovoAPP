import { auth } from "@/lib/auth";
import { CalendarClient } from "@/components/calendar/calendar-client";
import { getCalendarEvents, getHolidaysForYear } from "@/actions/calendar";
import { CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kalendář" };

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [events, holidays] = await Promise.all([
    getCalendarEvents(year, month),
    getHolidaysForYear(year),
  ]);

  const canManage = session.user.role === "ADMIN" || session.user.role === "MANAGER";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
          <CalendarDays className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Kalendář</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Svátky a firemní události
          </p>
        </div>
      </div>

      <CalendarClient
        initialEvents={JSON.parse(JSON.stringify(events))}
        holidays={JSON.parse(JSON.stringify(holidays))}
        canManage={canManage}
        currentUserId={session.user.id}
        initialYear={year}
        initialMonth={month}
      />
    </div>
  );
}
