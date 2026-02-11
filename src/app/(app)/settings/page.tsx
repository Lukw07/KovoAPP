import Link from "next/link";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { SecuritySettings } from "@/components/settings/security-settings";
import { HelpSection } from "@/components/settings/help-section";
import { LogoutButton } from "@/components/settings/logout-button";
import {
  ShieldCheck,
  Database,
  CaretRight,
} from "@phosphor-icons/react/dist/ssr";

export const metadata = { title: "Nastavení" };

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="animate-fade-in-up text-xl font-bold text-slate-900 dark:text-slate-100">
        Nastavení
      </h1>

      {/* Theme / Dark mode toggle */}
      <ThemeToggle />

      {/* Push notifications */}
      <NotificationSettings />

      {/* Security — password change */}
      <SecuritySettings />

      {/* GDPR — My Data & Privacy */}
      <div className="animate-fade-in-up stagger-4 space-y-2">
        <Link
          href="/settings/my-data"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-card-hover active:scale-[0.99]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <Database
              weight="fill"
              className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Moje data</p>
            <p className="text-xs text-foreground-secondary">
              Export osobních údajů, žádost o výmaz
            </p>
          </div>
          <CaretRight className="h-4 w-4 text-foreground-muted shrink-0" />
        </Link>

        <Link
          href="/settings/privacy"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-card-hover active:scale-[0.99]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <ShieldCheck
              weight="fill"
              className="h-5 w-5 text-blue-600 dark:text-blue-400"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Ochrana osobních údajů
            </p>
            <p className="text-xs text-foreground-secondary">
              Zásady zpracování a vaše práva dle GDPR
            </p>
          </div>
          <CaretRight className="h-4 w-4 text-foreground-muted shrink-0" />
        </Link>
      </div>

      {/* Help & FAQ */}
      <HelpSection />

      {/* Logout */}
      <LogoutButton />
    </div>
  );
}
