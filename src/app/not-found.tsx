import { MagnifyingGlass, House } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-background-secondary inner-glow">
          <MagnifyingGlass className="h-10 w-10 text-foreground-muted" weight="duotone" />
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-foreground">
          404
        </h1>
        <p className="mt-2 text-lg font-semibold text-foreground-secondary">
          Stránka nenalezena
        </p>
        <p className="mt-2 text-sm text-foreground-muted">
          Stránka, kterou hledáte, neexistuje nebo byla přesunuta.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_var(--accent-glow)] hover:bg-accent-hover btn-press active:scale-[0.98] transition-all focus-ring"
        >
          <House className="h-4 w-4" weight="bold" />
          Na úvodní stránku
        </Link>
      </div>
    </div>
  );
}
