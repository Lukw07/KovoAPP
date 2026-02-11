"use client";

import { useEffect, useState } from "react";
import { MobileLayout } from "./mobile-layout";
import { DesktopLayout } from "./desktop-layout";
import { RealtimeRefreshProvider } from "@/components/providers/realtime-refresh-provider";

const DESKTOP_BREAKPOINT = 1024; // lg

/**
 * Detects viewport width and renders the appropriate layout.
 * Mobile: top bar + bottom nav + drawer sidebar
 * Desktop: permanent sidebar + wide content (≥1024px)
 */
export function ResponsiveLayout({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    setIsDesktop(mq.matches);

    function onChange(e: MediaQueryListEvent) {
      setIsDesktop(e.matches);
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // SSR / initial render — use mobile-first, match with CSS to avoid flash
  if (isDesktop === null) {
    return (
      <>
        {/* Mobile (default, hidden on lg+) */}
        <div className="lg:hidden">
          <MobileLayout>{children}</MobileLayout>
        </div>
        {/* Desktop (hidden below lg) */}
        <div className="hidden lg:block h-dvh">
          <DesktopLayout>{children}</DesktopLayout>
        </div>
      </>
    );
  }

  return isDesktop ? (
    <>
      <RealtimeRefreshProvider />
      <DesktopLayout>{children}</DesktopLayout>
    </>
  ) : (
    <>
      <RealtimeRefreshProvider />
      <MobileLayout>{children}</MobileLayout>
    </>
  );
}
