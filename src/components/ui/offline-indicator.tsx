"use client";

import { useEffect, useState } from "react";
import { WifiSlash } from "@phosphor-icons/react";

/**
 * Offline indicator banner — shows when device loses internet connection.
 */
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
    }
    function handleOffline() {
      setIsOffline(true);
    }

    // Check initial state
    setIsOffline(!navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      className="fixed top-16 inset-x-0 z-50 flex items-center justify-center gap-2 bg-warning/90 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm animate-fade-in-up"
    >
      <WifiSlash className="h-4 w-4" weight="bold" />
      <span>Jste offline — některé funkce nemusí fungovat</span>
    </div>
  );
}
