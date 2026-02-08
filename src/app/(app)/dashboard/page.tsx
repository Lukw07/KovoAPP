import { auth } from "@/lib/auth";
import { getMyApprovedVacations, getPendingForManager } from "@/actions/hr-queries";
import VacationCalendar from "@/components/hr/vacation-calendar";
import TeamStatus from "@/components/hr/team-status";
import Link from "next/link";
import {
  CalendarDots,
  Car,
  Star,
  ShieldCheck,
  WarningCircle,
  CaretRight,
  Newspaper,
  Gift,
} from "@phosphor-icons/react/dist/ssr";

export const metadata = { title: "Přehled" };

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;
  const isManagement =
    user?.role === "ADMIN" || user?.role === "MANAGER";

  const currentYear = new Date().getFullYear();
  const [vacations, pendingRequests] = await Promise.all([
    getMyApprovedVacations(currentYear),
    isManagement ? getPendingForManager() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      {/* ── Welcome hero — premium gradient with layered glow ──── */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 text-white shadow-[0_4px_24px_rgba(99,102,241,0.35)]">
        {/* Subtle noise texture overlay */}
        <div className="noise absolute inset-0 rounded-2xl" />

        <p className="relative text-sm font-medium text-indigo-200">Vítejte zpět,</p>
        <h1 className="relative mt-1 text-2xl font-bold tracking-tight">{user?.name}</h1>
        <div className="relative mt-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 rounded-xl bg-white/12 px-3 py-2 backdrop-blur-sm border border-white/10">
            <Star className="h-4 w-4 text-amber-300" weight="fill" />
            <span className="text-sm font-semibold tabular-nums">
              {user?.pointsBalance} bodů
            </span>
          </div>
          {isManagement && (
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-xl bg-white/12 px-3 py-2 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all duration-150 btn-press active:scale-[0.97]"
            >
              <ShieldCheck className="h-4 w-4" weight="bold" />
              <span className="text-sm font-semibold">Správa</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Pending requests alert — premium amber card ─────── */}
      {isManagement && pendingRequests.length > 0 && (
        <Link
          href="/requests"
          className="flex items-center gap-3 rounded-2xl border border-amber-200/60 dark:border-amber-700/30 bg-amber-50 dark:bg-amber-900/15 p-4 btn-press active:scale-[0.98] card-hover inner-glow"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-800/40">
            <WarningCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" weight="fill" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {pendingRequests.length}{" "}
              {pendingRequests.length === 1
                ? "žádost čeká"
                : pendingRequests.length < 5
                  ? "žádosti čekají"
                  : "žádostí čeká"}{" "}
              na schválení
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400/70">
              Klikněte pro zobrazení a schválení
            </p>
          </div>
          <CaretRight className="h-5 w-5 text-amber-400" weight="bold" />
        </Link>
      )}

      {/* ── Quick actions — Bento grid layout ──────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <QuickAction
          href="/requests"
          icon={<CalendarDots className="h-6 w-6 text-indigo-600 dark:text-indigo-400" weight="duotone" />}
          label="Nová žádost"
          sublabel="Dovolená / Sick day"
          accentColor="indigo"
        />
        <QuickAction
          href="/reservations"
          icon={<Car className="h-6 w-6 text-emerald-600 dark:text-emerald-400" weight="duotone" />}
          label="Rezervovat"
          sublabel="Auto / Místnost"
          accentColor="emerald"
        />
        <QuickAction
          href="/news"
          icon={<Newspaper className="h-6 w-6 text-violet-600 dark:text-violet-400" weight="duotone" />}
          label="Novinky"
          sublabel="Firemní zprávy"
          accentColor="violet"
        />
        <QuickAction
          href="/rewards"
          icon={<Gift className="h-6 w-6 text-amber-600 dark:text-amber-400" weight="duotone" />}
          label="Odměny"
          sublabel="Vyměnit body"
          accentColor="amber"
        />
      </div>

      {/* ── Vacation calendar ──────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">
          Můj kalendář
        </h2>
        <VacationCalendar vacations={vacations} />
      </div>

      {/* ── Who is absent today ────────────────────────────── */}
      <TeamStatus />
    </div>
  );
}

/* Bento-style quick action tile */
const ACCENT_BG: Record<string, string> = {
  indigo: "bg-indigo-50 dark:bg-indigo-950/30",
  emerald: "bg-emerald-50 dark:bg-emerald-950/30",
  violet: "bg-violet-50 dark:bg-violet-950/30",
  amber: "bg-amber-50 dark:bg-amber-950/30",
};

function QuickAction({
  href,
  icon,
  label,
  sublabel,
  accentColor,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  accentColor: string;
}) {
  return (
    <Link
      href={href}
      className={`${ACCENT_BG[accentColor] ?? ""} relative flex flex-col gap-2 rounded-2xl border border-border p-4 btn-press active:scale-[0.97] card-hover inner-glow overflow-hidden`}
    >
      {icon}
      <div>
        <p className="text-sm font-semibold tracking-tight text-foreground">{label}</p>
        <p className="text-xs text-foreground-muted">{sublabel}</p>
      </div>
    </Link>
  );
}
