"use client";

import {
  Bell,
  BellOff,
  Loader2,
  Smartphone,
  AlertTriangle,
  Check,
  Info,
} from "lucide-react";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import { cn } from "@/lib/utils";

export function NotificationSettings() {
  const {
    permission,
    isSupported,
    isStandalone,
    isIOS,
    shouldPromptA2HS,
    requestPermission,
    isLoading,
    error,
  } = useNotificationPermission();

  const isGranted = permission === "granted";
  const isDenied = permission === "denied";

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            isGranted
              ? "bg-emerald-100 dark:bg-emerald-900/30"
              : "bg-slate-100 dark:bg-slate-700",
          )}
        >
          {isGranted ? (
            <Bell className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <BellOff className="h-5 w-5 text-slate-400 dark:text-slate-500" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Push notifikace
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isGranted
              ? "Notifikace jsou povoleny"
              : isDenied
                ? "Notifikace jsou blokované"
                : "Povolte notifikace pro aktuální informace"}
          </p>
        </div>
      </div>

      {/* Status indicator */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium",
          isGranted
            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
            : isDenied
              ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
              : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
        )}
      >
        {isGranted ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Budete dostávat upozornění na nové zprávy, body a další události.
          </>
        ) : isDenied ? (
          <>
            <AlertTriangle className="h-3.5 w-3.5" />
            Notifikace byly zablokované. Povolte je v nastavení prohlížeče.
          </>
        ) : (
          <>
            <Info className="h-3.5 w-3.5" />
            Klikněte níže pro povolení notifikací.
          </>
        )}
      </div>

      {/* iOS A2HS notice */}
      {shouldPromptA2HS && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300">
          <Smartphone className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Pro push notifikace na iOS nejdříve přidejte aplikaci na domovskou
            obrazovku: <strong>Sdílet → Přidat na plochu</strong>
          </span>
        </div>
      )}

      {/* Action button */}
      {!isGranted && !isDenied && isSupported && (
        <button
          onClick={requestPermission}
          disabled={isLoading || shouldPromptA2HS}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all",
            isLoading || shouldPromptA2HS
              ? "bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm active:scale-[0.98]",
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Povolování…
            </>
          ) : (
            <>
              <Bell className="h-4 w-4" />
              Povolit notifikace
            </>
          )}
        </button>
      )}

      {/* Browser settings hint for denied */}
      {isDenied && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Tip: V Chrome klikněte na ikonu zámku v adresním řádku → Oprávnění →
          Oznámení → Povolit
        </p>
      )}

      {/* Not supported */}
      {!isSupported && permission !== "loading" && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          Tento prohlížeč nepodporuje push notifikace.
        </div>
      )}

      {/* Device info */}
      {(isIOS || isStandalone) && (
        <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
          <Smartphone className="h-3 w-3" />
          {isStandalone ? "Běží jako PWA" : "iOS Safari"}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
