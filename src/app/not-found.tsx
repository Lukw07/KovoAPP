import { SearchX, Home } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          <SearchX className="h-10 w-10 text-slate-400 dark:text-slate-500" />
        </div>
        <h1 className="text-5xl font-black text-slate-900 dark:text-slate-100">
          404
        </h1>
        <p className="mt-2 text-lg font-semibold text-slate-700 dark:text-slate-300">
          Stránka nenalezena
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Stránka, kterou hledáte, neexistuje nebo byla přesunuta.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all"
        >
          <Home className="h-4 w-4" />
          Na úvodní stránku
        </Link>
      </div>
    </div>
  );
}
