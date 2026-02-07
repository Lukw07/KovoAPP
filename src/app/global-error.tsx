"use client";

import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="cs">
      <body className="bg-slate-50 dark:bg-slate-950 font-sans antialiased">
        <div className="flex min-h-dvh items-center justify-center px-4">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Něco se pokazilo
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Omlouváme se, došlo k neočekávané chybě. Zkuste to prosím znovu.
            </p>
            {error.digest && (
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                Kód chyby: {error.digest}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all"
              >
                <RotateCcw className="h-4 w-4" />
                Zkusit znovu
              </button>
              <a
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-all"
              >
                <Home className="h-4 w-4" />
                Na úvodní stránku
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
