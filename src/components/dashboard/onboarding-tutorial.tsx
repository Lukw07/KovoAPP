"use client";

// ============================================================================
// OnboardingTutorial — Unskippable first-run tutorial with platform-specific
// notification instructions. Saves completion to localStorage.
// ============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HandWaving,
  BellRinging,
  DownloadSimple,
  Gear,
  CheckCircle,
  ArrowRight,
  DeviceMobile,
  Desktop,
  AppleLogo,
  AndroidLogo,
  LinuxLogo,
  WindowsLogo,
  Globe,
  Info,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

type Platform = "ios" | "android" | "windows" | "macos" | "linux" | "unknown";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  const platform = (navigator as { userAgentData?: { platform?: string } })
    .userAgentData?.platform || navigator.platform || "";

  // iOS
  if (
    /iPad|iPhone|iPod/.test(ua) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1)
  ) {
    return "ios";
  }
  // Android
  if (/Android/.test(ua)) return "android";
  // Windows
  if (/Win/.test(platform) || /Windows/.test(ua)) return "windows";
  // macOS (desktop, not iPad)
  if (/Mac/.test(platform)) return "macos";
  // Linux
  if (/Linux/.test(platform) || /Linux/.test(ua)) return "linux";

  return "unknown";
}

function getPlatformIcon(p: Platform) {
  switch (p) {
    case "ios":
      return <AppleLogo weight="fill" className="h-5 w-5" />;
    case "android":
      return <AndroidLogo weight="fill" className="h-5 w-5" />;
    case "windows":
      return <WindowsLogo weight="fill" className="h-5 w-5" />;
    case "macos":
      return <AppleLogo weight="fill" className="h-5 w-5" />;
    case "linux":
      return <LinuxLogo weight="fill" className="h-5 w-5" />;
    default:
      return <Globe weight="fill" className="h-5 w-5" />;
  }
}

function getPlatformLabel(p: Platform) {
  switch (p) {
    case "ios":
      return "iOS (iPhone / iPad)";
    case "android":
      return "Android";
    case "windows":
      return "Windows";
    case "macos":
      return "macOS";
    case "linux":
      return "Linux";
    default:
      return "Váš systém";
  }
}

// ---------------------------------------------------------------------------
// Tutorial steps
// ---------------------------------------------------------------------------

interface TutorialStep {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

function getNotificationSteps(platform: Platform): React.ReactNode {
  const common = (
    <div className="space-y-3 text-sm text-foreground-secondary">
      <p>
        Pro správné fungování notifikací je potřeba <strong>přidat aplikaci na
        plochu</strong> a <strong>povolit notifikace</strong>.
      </p>
    </div>
  );

  const instructions: Record<Platform, React.ReactNode> = {
    ios: (
      <div className="space-y-3 text-sm">
        {common}
        <div className="rounded-xl border border-border bg-background p-3 space-y-2">
          <p className="font-semibold text-foreground flex items-center gap-2">
            <AppleLogo weight="fill" className="h-4 w-4" /> iOS — krok za krokem
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-foreground-secondary text-xs">
            <li>
              Otevřete aplikaci v <strong>Safari</strong> (jiný prohlížeč nepodporuje instalaci na
              iOS)
            </li>
            <li>
              Klepněte na ikonu <strong>Sdílet</strong> (čtvereček se šipkou
              nahoru) v dolní liště
            </li>
            <li>
              Vyberte <strong>„Přidat na plochu"</strong> (Add to Home Screen)
            </li>
            <li>Potvrďte klepnutím na <strong>„Přidat"</strong></li>
            <li>
              Otevřete aplikaci z plochy — automaticky se zobrazí výzva k
              povolení notifikací
            </li>
          </ol>
        </div>
      </div>
    ),
    android: (
      <div className="space-y-3 text-sm">
        {common}
        <div className="rounded-xl border border-border bg-background p-3 space-y-2">
          <p className="font-semibold text-foreground flex items-center gap-2">
            <AndroidLogo weight="fill" className="h-4 w-4" /> Android — krok za
            krokem
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-foreground-secondary text-xs">
            <li>
              Otevřete aplikaci v <strong>Chrome</strong> (doporučeno)
            </li>
            <li>
              Klepněte na <strong>⋮</strong> (tři tečky) vpravo nahoře
            </li>
            <li>
              Vyberte <strong>„Přidat na plochu"</strong> nebo{" "}
              <strong>„Nainstalovat aplikaci"</strong>
            </li>
            <li>Potvrďte instalaci</li>
            <li>
              Při prvním spuštění povolte notifikace klepnutím na{" "}
              <strong>„Povolit"</strong>
            </li>
            <li>
              Pokud jste zamítli — <strong>Nastavení → Aplikace → Chrome →
              Notifikace → Povolit</strong>
            </li>
          </ol>
        </div>
      </div>
    ),
    windows: (
      <div className="space-y-3 text-sm">
        {common}
        <div className="rounded-xl border border-border bg-background p-3 space-y-2">
          <p className="font-semibold text-foreground flex items-center gap-2">
            <WindowsLogo weight="fill" className="h-4 w-4" /> Windows — krok za
            krokem
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-foreground-secondary text-xs">
            <li>
              Otevřete aplikaci v <strong>Chrome</strong> nebo{" "}
              <strong>Edge</strong>
            </li>
            <li>
              V adresním řádku se zobrazí ikona <strong>⊕</strong>{" "}
              (Nainstalovat) — klikněte na ni
            </li>
            <li>
              Alternativně: <strong>⋮ → Nainstalovat KOVO Apku</strong>
            </li>
            <li>
              Při prvním spuštění povolte notifikace kliknutím na{" "}
              <strong>„Povolit"</strong>
            </li>
            <li>
              Pokud jste zamítli — klikněte na ikonu 🔒 v adresním řádku →{" "}
              <strong>Notifikace → Povolit</strong>
            </li>
          </ol>
        </div>
      </div>
    ),
    macos: (
      <div className="space-y-3 text-sm">
        {common}
        <div className="rounded-xl border border-border bg-background p-3 space-y-2">
          <p className="font-semibold text-foreground flex items-center gap-2">
            <AppleLogo weight="fill" className="h-4 w-4" /> macOS — krok za
            krokem
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-foreground-secondary text-xs">
            <li>
              Otevřete aplikaci v <strong>Chrome</strong> nebo{" "}
              <strong>Safari 17+</strong>
            </li>
            <li>
              <strong>Chrome:</strong> klikněte na ikonu ⊕ v adresním řádku →
              „Nainstalovat"
            </li>
            <li>
              <strong>Safari:</strong> Soubor → <strong>Přidat do Docku</strong>
            </li>
            <li>
              Povolte notifikace — <strong>Nastavení systému → Oznámení
              → prohlížeč/aplikace → Povolit</strong>
            </li>
          </ol>
        </div>
      </div>
    ),
    linux: (
      <div className="space-y-3 text-sm">
        {common}
        <div className="rounded-xl border border-border bg-background p-3 space-y-2">
          <p className="font-semibold text-foreground flex items-center gap-2">
            <LinuxLogo weight="fill" className="h-4 w-4" /> Linux — krok za
            krokem
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-foreground-secondary text-xs">
            <li>
              Otevřete aplikaci v <strong>Chrome</strong> nebo{" "}
              <strong>Chromium</strong>
            </li>
            <li>
              Klikněte na ikonu <strong>⊕</strong> v adresním řádku →
              „Nainstalovat"
            </li>
            <li>
              Při prvním spuštění povolte notifikace kliknutím na{" "}
              <strong>„Povolit"</strong>
            </li>
            <li>
              Pokud jste zamítli — klikněte na 🔒 v adresním řádku →
              Notifikace → Povolit
            </li>
          </ol>
        </div>
      </div>
    ),
    unknown: (
      <div className="space-y-3 text-sm">
        {common}
        <div className="rounded-xl border border-border bg-background p-3 space-y-2">
          <p className="font-semibold text-foreground flex items-center gap-2">
            <Globe weight="fill" className="h-4 w-4" /> Obecný postup
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-foreground-secondary text-xs">
            <li>Otevřete aplikaci v podporovaném prohlížeči (Chrome, Edge, Safari)</li>
            <li>Přidejte aplikaci na plochu / nainstalujte ji</li>
            <li>Povolte notifikace při výzvě</li>
            <li>
              Pokud jste zamítli — povolte v nastavení prohlížeče (ikona 🔒
              v adresním řádku)
            </li>
          </ol>
        </div>
      </div>
    ),
  };

  return instructions[platform];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const LS_KEY = "kovo-tutorial-completed";

export function OnboardingTutorial() {
  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem(LS_KEY);
  });
  const [step, setStep] = useState(0);
  const [platform] = useState<Platform>(() => {
    if (typeof window === "undefined") return "unknown";
    return detectPlatform();
  });

  const steps: TutorialStep[] = [
      {
        id: "welcome",
        title: "Vítejte v KOVO Apce!",
        icon: (
          <HandWaving
            weight="fill"
            className="h-8 w-8 text-amber-500"
          />
        ),
        content: (
          <div className="space-y-3 text-sm text-foreground-secondary">
            <div className="flex items-center gap-2 rounded-xl bg-accent/10 px-3 py-2 text-xs font-medium text-accent">
              <Info weight="fill" className="h-4 w-4 shrink-0" />
              Toto je krátký tutoriál — provede vás základními funkcemi
              aplikace.
            </div>
            <p>
              KOVO Apka je váš centrální portál pro správu dovolených, rezervací,
              interní komunikaci, bodový systém a mnohem více.
            </p>
            <p>
              Projděte si následující kroky, abyste aplikaci mohli plně
              využívat.
            </p>
          </div>
        ),
      },
      {
        id: "features",
        title: "Hlavní funkce",
        icon: <Gear weight="fill" className="h-8 w-8 text-accent" />,
        content: (
          <div className="space-y-2 text-sm text-foreground-secondary">
            <ul className="space-y-2">
              {[
                ["📋", "Žádosti", "Dovolené, sick day, home office — vše na jednom místě"],
                ["📅", "Rezervace", "Firemní vozidla, zasedačky a vybavení"],
                ["💬", "Zprávy", "Interní chat s kolegy"],
                ["🎁", "Odměny", "Sbírejte body a vyměňte za odměny"],
                ["📰", "Novinky", "Firemní aktuality a ankety"],
              ].map(([emoji, title, desc]) => (
                <li
                  key={title}
                  className="flex items-start gap-2.5 rounded-xl bg-background p-2.5 border border-border"
                >
                  <span className="text-lg">{emoji}</span>
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      {title}
                    </span>
                    <p className="text-xs text-foreground-muted">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ),
      },
      {
        id: "install",
        title: "Instalace na plochu",
        icon: (
          <DownloadSimple weight="fill" className="h-8 w-8 text-blue-500" />
        ),
        content: (
          <div className="space-y-3 text-sm text-foreground-secondary">
            <p>
              Pro nejlepší zážitek <strong>přidejte aplikaci na plochu</strong>.
              Bude se chovat jako nativní aplikace — rychlejší načtení, bez
              adresního řádku.
            </p>
            <div className="flex items-center gap-2 text-xs rounded-xl bg-background border border-border p-2.5">
              {getPlatformIcon(platform)}
              <span className="font-medium text-foreground">
                Detekován systém: {getPlatformLabel(platform)}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "notifications",
        title: "Nastavení notifikací",
        icon: (
          <BellRinging weight="fill" className="h-8 w-8 text-emerald-500" />
        ),
        content: getNotificationSteps(platform),
      },
      {
        id: "done",
        title: "Vše připraveno!",
        icon: (
          <CheckCircle weight="fill" className="h-8 w-8 text-emerald-500" />
        ),
        content: (
          <div className="space-y-3 text-sm text-foreground-secondary">
            <p>
              Tutoriál je u konce. Nyní můžete začít používat aplikaci naplno.
            </p>
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-700 dark:text-amber-300">
              <p className="font-semibold mb-1">⚠️ Důležité upozornění</p>
              <p>
                Pro správné fungování push notifikací je <strong>nutné
                přidat aplikaci na plochu</strong> vašeho zařízení a{" "}
                <strong>povolit notifikace</strong> dle pokynů v předchozím
                kroku.
              </p>
            </div>
            <p className="text-xs text-foreground-muted">
              Tutoriál je možné znovu zobrazit v{" "}
              <strong>Nastavení → Nápověda</strong>.
            </p>
          </div>
        ),
      },
    ];

  const isLast = step === steps.length - 1;

  function handleNext() {
    if (isLast) {
      localStorage.setItem(LS_KEY, new Date().toISOString());
      setShow(false);
    } else {
      setStep((s) => s + 1);
    }
  }

  if (!show) return null;

  const current = steps[step];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header badge */}
            <div className="bg-accent/5 border-b border-border px-5 py-2.5 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
                Tutoriál
              </span>
              <span className="text-[10px] text-foreground-muted">
                {step + 1} / {steps.length}
              </span>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Icon + title */}
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-background-secondary">
                  {current.icon}
                </div>
                <h2 className="text-lg font-bold text-foreground">
                  {current.title}
                </h2>
              </div>

              {/* Step content */}
              <div className="max-h-[50vh] overflow-y-auto pr-1">
                {current.content}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border px-5 py-3 flex items-center justify-between">
              {/* Progress dots */}
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i === step
                        ? "w-6 bg-accent"
                        : i < step
                          ? "w-1.5 bg-accent/40"
                          : "w-1.5 bg-border",
                    )}
                  />
                ))}
              </div>

              {/* Next button — no skip */}
              <Button size="sm" onClick={handleNext}>
                {isLast ? (
                  <>
                    Začít používat
                    <CheckCircle weight="bold" className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Pokračovat
                    <ArrowRight weight="bold" className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
