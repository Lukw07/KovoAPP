"use client";

import { useState, useEffect } from "react";
import { DownloadSimple, X, ShareNetwork } from "@phosphor-icons/react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PWA Install Banner — captures the `beforeinstallprompt` event on Android/Chrome
 * and shows a native-looking banner to install the app to the home screen.
 * On iOS Safari (not standalone), shows A2HS instructions.
 * Hidden entirely when running as an installed PWA.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOSSafari, setIsIOSSafari] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone;
    if (standalone) {
      setIsInstalled(true);
      return;
    }

    // iOS Safari detection (not in standalone mode)
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari =
      /Safari/.test(navigator.userAgent) &&
      !/CriOS|FxiOS|Chrome/.test(navigator.userAgent);
    if (ios && isSafari) {
      setIsIOSSafari(true);
    }

    // Check localStorage for previous dismiss
    const dismissedAt = localStorage.getItem("pwa-install-dismissed");
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt);
      // Show again after 7 days
      if (elapsed < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }

    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    function installedHandler() {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  // Don't show when installed or dismissed
  if (isInstalled || dismissed) return null;

  // Nothing to show on non-iOS, non-Chrome browsers with no prompt
  if (!deferredPrompt && !isIOSSafari) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
  }

  // iOS Safari — show A2HS instructions
  if (isIOSSafari && !deferredPrompt) {
    return (
      <div className="mx-4 mt-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-800">
            <DownloadSimple className="h-5 w-5 text-blue-600 dark:text-blue-400" weight="bold" />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Nainstalujte si aplikaci
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Přidejte KOVO Apku na plochu pro rychlejší přístup:
            </p>
            <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
              <ShareNetwork className="h-4 w-4" weight="bold" />
              <span>Sdílet</span>
              <span className="text-blue-400 dark:text-blue-500">→</span>
              <Plus className="h-3.5 w-3.5" />
              <span>Přidat na plochu</span>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 rounded-lg p-1.5 text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Android / Chrome — native install prompt
  return (
    <div className="mx-4 mt-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-800">
          <DownloadSimple className="h-5 w-5 text-blue-600 dark:text-blue-400" weight="bold" />
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
            Nainstalujte si aplikaci
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Přidejte KOVO Apku na plochu pro rychlejší přístup a offline podporu.
          </p>
          <button
            onClick={handleInstall}
            className={cn(
              "flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-all active:scale-95 hover:bg-accent-hover",
            )}
          >
            <DownloadSimple className="h-3.5 w-3.5" weight="bold" />
            Nainstalovat
          </button>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1.5 text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
