"use client";

import { useState } from "react";
import { Bell, BellOff, X, Share, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";

/**
 * Banner that prompts users to enable push notifications.
 * Handles iOS A2HS flow and standard permission request.
 * Renders nothing if already granted or dismissed.
 */
export function NotificationPrompt() {
  const {
    permission,
    isSupported,
    isIOS,
    shouldPromptA2HS,
    requestPermission,
    isLoading,
    error,
  } = useNotificationPermission();

  const [dismissed, setDismissed] = useState(false);

  // Don't show if already granted, denied permanently, unsupported, or dismissed
  if (
    permission === "granted" ||
    permission === "loading" ||
    !isSupported ||
    dismissed
  ) {
    return null;
  }

  // iOS Safari — needs Add to Home Screen first
  if (shouldPromptA2HS) {
    return (
      <div className="mx-4 mt-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-800">
            <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Chcete dostávat notifikace?
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Na iOS nejdříve přidejte aplikaci na plochu:
            </p>
            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
              <Share className="h-3.5 w-3.5" />
              <span>Sdílet</span>
              <span>→</span>
              <Plus className="h-3.5 w-3.5" />
              <span>Přidat na plochu</span>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 rounded-lg p-1.5 text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Permission denied
  if (permission === "denied") {
    return (
      <div className="mx-4 mt-3 rounded-xl border border-border bg-background p-4">
        <div className="flex items-center gap-3">
          <BellOff className="h-5 w-5 text-foreground-muted" />
          <div className="flex-1">
            <p className="text-sm text-foreground-secondary">
              Notifikace jsou zablokované. Povolte je v nastavení prohlížeče.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 rounded-lg p-1.5 text-foreground-muted hover:bg-background-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Default — prompt to enable
  return (
    <div className="mx-4 mt-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-800">
          <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
            Zapněte si push notifikace
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Budete informováni o schválených žádostech, nových příspěvcích a
            získaných bodech.
          </p>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
          <button
            onClick={requestPermission}
            disabled={isLoading}
            className={cn(
              "flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-all active:scale-95 hover:bg-accent-hover disabled:opacity-50",
            )}
          >
            <Bell className="h-3.5 w-3.5" />
            {isLoading ? "Nastavuji..." : "Povolit notifikace"}
          </button>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-lg p-1.5 text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
