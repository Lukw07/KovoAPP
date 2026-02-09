"use client";

import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isVersionMismatch = error.message.includes("Failed to find Server Action");

  return (
    <html lang="cs">
      <body className="bg-background font-sans antialiased">
        <div className="flex min-h-dvh items-center justify-center px-4">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-danger-light">
              <AlertTriangle className="h-10 w-10 text-danger" />
            </div>
            
            {isVersionMismatch ? (
              <>
                <h1 className="text-2xl font-bold text-foreground">
                  Aplikace byla aktualizována
                </h1>
                <p className="mt-2 text-sm text-foreground-secondary">
                  Je k dispozici nová verze aplikace. Pro správnou funkčnost je potřeba obnovit stránku.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-foreground">
                  Něco se pokazilo
                </h1>
                <p className="mt-2 text-sm text-foreground-secondary">
                  Omlouváme se, došlo k neočekávané chybě. Zkuste to prosím znovu.
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-accent hover:bg-accent-hover active:scale-[0.98] transition-all glow-blue focus-ring"
              >
                <RotateCcw className="h-4 w-4" />
                {isVersionMismatch ? "Obnovit aplikaci" : "Zkusit znovu"}
              </button>
              
              {!isVersionMismatch && (
                <a
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground-secondary hover:bg-card-hover active:scale-[0.98] transition-all focus-ring"
                >
                  <Home className="h-4 w-4" />
                  Na úvodní stránku
                </a>
              )}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
