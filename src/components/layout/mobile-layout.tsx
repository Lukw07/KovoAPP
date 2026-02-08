"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { NotificationPrompt } from "@/components/notifications/notification-prompt";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { SearchModal } from "@/components/ui/search-modal";

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      {/* Top Bar */}
      <TopBar
        user={session?.user ?? null}
        onMenuClick={() => setSidebarOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
      />

      {/* Sidebar / Drawer */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={session?.user ?? null}
      />

      {/* Search Modal */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Main Content — padded for top bar + bottom nav */}
      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-18">
        {/* Connectivity / Push opt-in prompts */}
        <OfflineIndicator />
        <NotificationPrompt />
        {children}
      </main>

      {/* Bottom Navigation */}
      <BottomNav userRole={session?.user?.role ?? "EMPLOYEE"} />
    </div>
  );
}
