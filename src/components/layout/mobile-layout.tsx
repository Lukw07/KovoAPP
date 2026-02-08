"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";
import { NotificationPrompt } from "@/components/notifications/notification-prompt";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { SearchModal } from "@/components/ui/search-modal";
import { PwaInstallPrompt } from "@/components/notifications/pwa-install-prompt";

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      {/* Top Bar */}
      <TopBar
        user={session?.user ?? null}
        onSearchClick={() => setSearchOpen(true)}
      />

      {/* Search Modal */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Main Content — padded for top bar + bottom nav + iOS safe area */}
      <main className="flex-1 overflow-y-auto px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-18">
        {/* Connectivity / Push opt-in prompts */}
        <OfflineIndicator />
        <NotificationPrompt />
        <PwaInstallPrompt />
        {children}
      </main>

      {/* Bottom Navigation */}
      <BottomNav userRole={session?.user?.role ?? "EMPLOYEE"} />
    </div>
  );
}
