"use client";

import { Warning, ArrowCounterClockwise, House } from "@phosphor-icons/react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isVersionMismatch = error.message.includes("Failed to find Server Action");

  return (
    <div className="flex min-h-[60dvh] items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/20 inner-glow">
          <Warning className="h-10 w-10 text-red-500" weight="duotone" />
        </div>
        {isVersionMismatch ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Aplikace byla aktualizována
            </h1>
            <p className="mt-2 text-sm text-foreground-secondary">
              Je k dispozici nová verze aplikace. Pro správnou funkčnost je potřeba obnovit stránku.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Něco se pokazilo
            </h1>
            <p className="mt-2 text-sm text-foreground-secondary">
              Omlouváme se, při načítání stránky došlo k chybě.
            </p>
            {error.digest && (
              <p className="mt-2 text-xs text-foreground-muted">
                Kód chyby: {error.digest}
              </p>
            )}
          </>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => {
              if (isVersionMismatch) {
                window.location.reload();
              } else {
                reset();
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_var(--accent-glow)] hover:bg-accent-hover btn-press active:scale-[0.98] transition-all focus-ring"
          >
            <ArrowCounterClockwise className="h-4 w-4" weight="bold" />
            {isVersionMismatch ? "Obnovit aplikaci" : "Zkusit znovu"}
          </button>
          {!isVersionMismatch && (
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground-secondary hover:bg-card-hover btn-press active:scale-[0.98] transition-all focus-ring inner-glow"
            >
              <House className="h-4 w-4" weight="bold" />
              Na úvodní stránku
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
