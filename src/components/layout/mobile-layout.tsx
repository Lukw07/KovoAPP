"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { NotificationPrompt } from "@/components/notifications/notification-prompt";

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <div className="relative flex min-h-dvh flex-col bg-slate-50 dark:bg-slate-950">
      {/* Top Bar */}
      <TopBar
        user={session?.user ?? null}
        onMenuClick={() => setSidebarOpen(true)}
      />

      {/* Sidebar / Drawer */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={session?.user ?? null}
      />

      {/* Main Content — padded for top bar + bottom nav */}
      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-18">
        {/* Push notification opt-in prompt */}
        <NotificationPrompt />
        {children}
      </main>

      {/* Bottom Navigation */}
      <BottomNav userRole={session?.user?.role ?? "EMPLOYEE"} />
    </div>
  );
}
