"use client";

import { logoutAction } from "@/app/(auth)/actions";
import { LogOut, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      try {
        await logoutAction();
      } catch (error: unknown) {
        // signOut throws NEXT_REDIRECT internally — that's expected, not an error
        const err = error as Error & { digest?: string };
        if (
          err?.digest?.startsWith("NEXT_REDIRECT") ||
          err?.message?.includes("NEXT_REDIRECT")
        ) {
          throw error;
        }
        toast.error("Nepodařilo se odhlásit");
      }
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Odhlášení</h3>
          <p className="text-sm text-foreground-secondary">
            Bezpečně se odhlásit z aplikace
          </p>
        </div>
        <button
          onClick={handleLogout}
          disabled={isPending}
          className={cn(
            "flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 transition-all hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-95 disabled:opacity-50",
          )}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          Odhlásit
        </button>
      </div>
    </div>
  );
}
