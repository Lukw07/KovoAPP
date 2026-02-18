import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyApprovedVacations, getPendingForManager } from "@/actions/hr-queries";
import { getUnreadMessageCount } from "@/actions/messages";
import { getDashboardActivity, getDashboardStats, getUpcomingItems } from "@/actions/dashboard-queries";
import VacationCalendar from "@/components/hr/vacation-calendar";
import TeamStatus from "@/components/hr/team-status";
import DashboardHero from "@/components/dashboard/dashboard-hero";
import { OnboardingTutorial } from "@/components/dashboard/onboarding-tutorial";
import { UpcomingItems } from "@/components/dashboard/upcoming-items";
import Link from "next/link";
import {
  CalendarDots,
  Car,
  WarningCircle,
  CaretRight,
  Newspaper,
  Gift,
} from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { DashboardAnimations } from "./dashboard-animations";

export const metadata = { title: "Přehled" };

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const isManagement =
    user?.role === "ADMIN" || user?.role === "MANAGER";

  const currentYear = new Date().getFullYear();
  const [vacations, pendingRequests, unreadMessages, activityFeed, dashboardStats, freshUser, upcomingItems] = await Promise.all([
    getMyApprovedVacations(currentYear).catch(() => []),
    isManagement ? getPendingForManager().catch(() => []) : Promise.resolve([]),
    getUnreadMessageCount().catch(() => 0),
    getDashboardActivity(8).catch(() => []),
    getDashboardStats().catch(() => null),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { pointsBalance: true },
    }).catch(() => null),
    getUpcomingItems().catch(() => []),
  ]);

  return (
    <DashboardAnimations>
      {/* ── Onboarding tutorial for new users ─────────────── */}
      <OnboardingTutorial />

      {/* ── Welcome hero — animated gradient with activity feed ── */}
      <DashboardHero
        userName={user?.name ?? ""}
        avatarUrl={user?.avatarUrl ?? null}
        pointsBalance={freshUser?.pointsBalance ?? user?.pointsBalance ?? 0}
        unreadMessages={typeof unreadMessages === "number" ? unreadMessages : 0}
        initialActivity={activityFeed}
        stats={dashboardStats}
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
          icon={<CalendarDots className="h-6 w-6 text-blue-50" weight="duotone" />}
          label="Nová žádost"
          sublabel="Dovolená / Sick day"
          gradient="from-blue-600 to-indigo-700 dark:from-blue-600 dark:to-indigo-800"
          glowColor="blue"
        />
        <QuickAction
          href="/reservations"
          icon={<Car className="h-6 w-6 text-emerald-50" weight="duotone" />}
          label="Rezervovat"
          sublabel="Auto / Místnost"
          gradient="from-emerald-600 to-teal-700 dark:from-emerald-600 dark:to-teal-800"
          glowColor="emerald"
        />
        <QuickAction
          href="/news"
          icon={<Newspaper className="h-6 w-6 text-sky-50" weight="duotone" />}
          label="Novinky"
          sublabel="Firemní zprávy"
          gradient="from-sky-600 to-blue-700 dark:from-sky-600 dark:to-blue-800"
          glowColor="sky"
        />
        <QuickAction
          href="/rewards"
          icon={<Gift className="h-6 w-6 text-amber-50" weight="duotone" />}
          label="Odměny"
          sublabel="Vyměnit body"
          gradient="from-amber-500 to-orange-600 dark:from-amber-500 dark:to-orange-700"
          glowColor="amber"
        />
      </div>

      {/* ── Upcoming items — what awaits the user ─────────── */}
      <UpcomingItems items={upcomingItems} />

      {/* ── Vacation calendar ──────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground-secondary uppercase">
          Můj kalendář
        </h2>
        <VacationCalendar vacations={vacations} className="shadow-sm" />
      </div>

      {/* ── Who is absent today ────────────────────────────── */}
      <TeamStatus />
    </DashboardAnimations>
  );
}

/* Bento-style quick action tile */
const GLOW_SHADOW: Record<string, string> = {
  blue: "hover:shadow-blue-500/20 dark:hover:shadow-blue-500/30",
  emerald: "hover:shadow-emerald-500/20 dark:hover:shadow-emerald-500/30",
  sky: "hover:shadow-sky-500/20 dark:hover:shadow-sky-500/30",
  amber: "hover:shadow-amber-500/20 dark:hover:shadow-amber-500/30",
};

function QuickAction({
  href,
  icon,
  label,
  sublabel,
  gradient,
  glowColor,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  gradient: string;
  glowColor: string;
}) {
  return (
    <Link
      href={href}
      className={`relative flex flex-col gap-3 rounded-2xl bg-gradient-to-br ${gradient} p-4 btn-press active:scale-[0.97] overflow-hidden transition-all duration-250 hover:shadow-xl ${GLOW_SHADOW[glowColor] ?? ""} hover:-translate-y-0.5`}
    >
      {/* Subtle shine overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10 pointer-events-none" />
      <div className="relative z-10">
        {icon}
      </div>
      <div className="relative z-10">
        <p className="text-sm font-semibold tracking-tight text-white">{label}</p>
        <p className="text-xs text-white/70">{sublabel}</p>
      </div>
    </Link>
  );
}
