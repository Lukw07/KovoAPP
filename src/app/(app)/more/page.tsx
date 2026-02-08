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
} from "lucide-react";

export const metadata = { title: "Více" };

const ITEMS = [
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

export default function MorePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Více</h1>

      <div className="space-y-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm border border-slate-100 dark:border-slate-700 transition-transform active:scale-[0.98]"
            >
              <div
                className={`${item.bg} flex h-11 w-11 items-center justify-center rounded-xl`}
              >
                <Icon className={`h-5 w-5 ${item.color}`} />
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
    </div>
  );
}
