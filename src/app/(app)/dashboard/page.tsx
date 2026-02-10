import { auth } from "@/lib/auth";
import { getMyApprovedVacations, getPendingForManager } from "@/actions/hr-queries";
import { getLatestNews } from "@/actions/news-queries";
import { getUnreadMessageCount } from "@/actions/messages";
import VacationCalendar from "@/components/hr/vacation-calendar";
import TeamStatus from "@/components/hr/team-status";
import DashboardHero from "@/components/dashboard/dashboard-hero";
import Link from "next/link";
import {
  CalendarDots,
  Car,
  WarningCircle,
  CaretRight,
  Newspaper,
  Gift,
} from "@phosphor-icons/react/dist/ssr";
import { DashboardAnimations } from "./dashboard-animations";

export const metadata = { title: "Přehled" };

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;
  const isManagement =
    user?.role === "ADMIN" || user?.role === "MANAGER";

  const currentYear = new Date().getFullYear();
  const [vacations, pendingRequests, latestNews, unreadMessages] = await Promise.all([
    getMyApprovedVacations(currentYear),
    isManagement ? getPendingForManager() : Promise.resolve([]),
    getLatestNews(3),
    getUnreadMessageCount().catch(() => 0),
  ]);

  return (
    <DashboardAnimations>
      {/* ── Welcome hero — animated gradient with stats ────── */}
      <DashboardHero
        userName={user?.name ?? ""}
        avatarUrl={user?.avatarUrl ?? null}
        pointsBalance={user?.pointsBalance ?? 0}
        latestNews={latestNews}
        unreadMessages={typeof unreadMessages === "number" ? unreadMessages : 0}
      />

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
      <div className="grid grid-cols-2 gap-3" data-bento>
        <QuickAction
          href="/requests"
          icon={<CalendarDots className="h-6 w-6 text-blue-600 dark:text-blue-400" weight="duotone" />}
          label="Nová žádost"
          sublabel="Dovolená / Sick day"
          accentColor="blue"
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
          icon={<Newspaper className="h-6 w-6 text-blue-600 dark:text-blue-400" weight="duotone" />}
          label="Novinky"
          sublabel="Firemní zprávy"
          accentColor="blue"
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
    </DashboardAnimations>
  );
}

/* Bento-style quick action tile */
const ACCENT_BG: Record<string, string> = {
  blue: "bg-blue-50 dark:bg-blue-950/30",
  emerald: "bg-emerald-50 dark:bg-emerald-950/30",
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
