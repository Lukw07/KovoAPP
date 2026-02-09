"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";
import { Loader2, Factory } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, undefined);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent shadow-lg shadow-accent/30">
            <Factory className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">KOVO Apka</h1>
          <p className="mt-1 text-sm text-slate-400">
            Interní systém pro zaměstnance
          </p>
        </div>

        {/* Login Form */}
        <form action={formAction} className="space-y-4">
          <div className="overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md">
            {/* Error message */}
            {state?.error && (
              <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
                {state.error}
              </div>
            )}

            {/* Email */}
            <div className="border-b border-white/10 p-4">
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-medium text-slate-300"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="vas.email@kovo.cz"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder-slate-500 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>

            {/* Password */}
            <div className="p-4">
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-medium text-slate-300"
              >
                Heslo
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder-slate-500 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-4 text-base font-semibold text-white shadow-lg shadow-accent/30 glow-blue transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Přihlašování...
              </>
            ) : (
              "Přihlásit se"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
