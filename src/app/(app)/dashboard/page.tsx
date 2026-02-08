import { auth } from "@/lib/auth";
import { LayoutDashboard, CalendarDays, Car, Star } from "lucide-react";
import { getMyApprovedVacations } from "@/actions/hr-queries";
import VacationCalendar from "@/components/hr/vacation-calendar";
import TeamStatus from "@/components/hr/team-status";

export const metadata = { title: "Přehled" };

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;

  const currentYear = new Date().getFullYear();
  const vacations = await getMyApprovedVacations(currentYear);

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white shadow-lg shadow-blue-600/20">
        <p className="text-sm text-blue-200">Vítejte zpět,</p>
        <h1 className="mt-1 text-2xl font-bold">{user?.name} 👋</h1>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm w-fit">
          <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
          <span className="text-sm font-semibold">
            {user?.pointsBalance} bodů
          </span>
        </div>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-2 gap-3">
        <QuickAction
          href="/requests"
          icon={<CalendarDays className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
          label="Nová žádost"
          sublabel="Dovolená / Sick day"
          bgColor="bg-blue-50 dark:bg-blue-900/30"
        />
        <QuickAction
          href="/reservations"
          icon={<Car className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />}
          label="Rezervovat"
          sublabel="Auto / Místnost"
          bgColor="bg-emerald-50 dark:bg-emerald-900/30"
        />
        <QuickAction
          href="/news"
          icon={<LayoutDashboard className="h-6 w-6 text-purple-600 dark:text-purple-400" />}
          label="Novinky"
          sublabel="Firemní zprávy"
          bgColor="bg-purple-50 dark:bg-purple-900/30"
        />
        <QuickAction
          href="/rewards"
          icon={<Star className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
          label="Odměny"
          sublabel="Vyměnit body"
          bgColor="bg-amber-50 dark:bg-amber-900/30"
        />
      </div>

      {/* Vacation calendar */}
      <div>
        <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">
          📅 Můj kalendář
        </h2>
        <VacationCalendar vacations={vacations} />
      </div>

      {/* Who is absent today */}
      <TeamStatus />
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  sublabel,
  bgColor,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  bgColor: string;
}) {
  return (
    <a
      href={href}
      className={`${bgColor} flex flex-col gap-2 rounded-2xl p-4 transition-transform active:scale-[0.97]`}
    >
      {icon}
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{sublabel}</p>
      </div>
    </a>
  );
}
