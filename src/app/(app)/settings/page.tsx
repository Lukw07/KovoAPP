import { ThemeToggle } from "@/components/settings/theme-toggle";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { SecuritySettings } from "@/components/settings/security-settings";
import { HelpSection } from "@/components/settings/help-section";
import { LogoutButton } from "@/components/settings/logout-button";

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

      {/* Help & FAQ */}
      <HelpSection />

      {/* Logout */}
      <LogoutButton />
    </div>
  );
}
