import Link from "next/link";
import {
  Newspaper,
  BarChart3,
  Gift,
  Briefcase,
  User,
  Settings,
  ChevronRight,
  Store,
  MessageCircle,
  ShieldCheck,
  ClipboardList,
  CalendarDays,
} from "lucide-react";
import { getUnreadMessageCount } from "@/actions/messages";
import { auth } from "@/lib/auth";
import { MorePageAnimations } from "./more-animations";

export const metadata = { title: "Více" };

const ITEMS = [
  {
    label: "Zprávy",
    href: "/messages",
    icon: MessageCircle,
    description: "Soukromé zprávy",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/30",
    hasBadge: true,
  },
  {
    label: "Kalendář",
    href: "/calendar",
    icon: CalendarDays,
    description: "Svátky a firemní události",
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-900/30",
  },
  {
    label: "Novinky",
    href: "/news",
    icon: Newspaper,
    description: "Firemní zprávy a oznámení",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/30",
  },
  {
    label: "Ankety",
    href: "/polls",
    icon: BarChart3,
    description: "Hlasujte v anketách",
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-900/30",
  },
  {
    label: "Odměny",
    href: "/rewards",
    icon: Gift,
    description: "Vyměňte body za odměny",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
  },
  {
    label: "Volné pozice",
    href: "/jobs",
    icon: Briefcase,
    description: "Doporučte známého",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/30",
  },
  {
    label: "Tržiště",
    href: "/marketplace",
    icon: Store,
    description: "Prodám / Koupím / Hledám",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/30",
  },
  {
    label: "Profil",
    href: "/profile",
    icon: User,
    description: "Vaše údaje a nastavení",
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-700",
  },
  {
    label: "Nastavení",
    href: "/settings",
    icon: Settings,
    description: "Notifikace, jazyk, vzhled",
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-700",
  },
] as const;

export default async function MorePage() {
  const [unreadCount, session] = await Promise.all([
    getUnreadMessageCount(),
    auth(),
  ]);
  const role = session?.user?.role;
  const isManagement = role === "ADMIN" || role === "MANAGER";

  return (
    <MorePageAnimations>
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Více</h1>

      {/* Management link for Admin/Manager */}
      {isManagement && (
        <Link
          href="/admin"
          className="flex items-center gap-4 rounded-2xl p-4 shadow-sm border transition-transform active:scale-[0.98] bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-800">
            {role === "ADMIN" ? (
              <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {role === "ADMIN" ? "Admin panel" : "Správa systému"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {role === "ADMIN"
                ? "Uživatelé, statistiky, export"
                : "Schvalování, ankety, inzeráty, odměny"}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-blue-400 dark:text-blue-500" />
        </Link>
      )}

      <div className="space-y-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const badge = 'hasBadge' in item && item.hasBadge ? unreadCount : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm border border-slate-100 dark:border-slate-700 transition-transform active:scale-[0.98]"
            >
              <div
                className={`${item.bg} relative flex h-11 w-11 items-center justify-center rounded-xl`}
              >
                <Icon className={`h-5 w-5 ${item.color}`} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {item.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
            </Link>
          );
        })}
      </div>
    </MorePageAnimations>
  );
}
