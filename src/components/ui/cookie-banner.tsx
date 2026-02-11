"use client";

// ============================================================================
// CookieBanner — GDPR-compliant informational cookie notice
// Only essential (session) cookies are used — no consent needed, but we inform.
// ============================================================================

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X, Info } from "@phosphor-icons/react";
import Link from "next/link";

const LS_KEY = "kovo-cookie-acknowledged";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const ack = localStorage.getItem(LS_KEY);
    if (!ack) {
      // Small delay so it doesn't flash on every page load
      const t = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  function handleAcknowledge() {
    localStorage.setItem(LS_KEY, new Date().toISOString());
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-4 right-4 z-[100] sm:left-auto sm:right-4 sm:max-w-sm"
        >
          <div className="rounded-2xl border border-border bg-card shadow-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <Cookie
                  weight="fill"
                  className="h-5 w-5 text-amber-600 dark:text-amber-400"
                />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Cookies
                </p>
                <p className="text-xs text-foreground-secondary leading-relaxed">
                  Tato aplikace používá pouze{" "}
                  <strong>technicky nezbytné cookies</strong> pro přihlášení.
                  Nepoužíváme analytické ani reklamní cookies.
                </p>
              </div>
              <button
                onClick={handleAcknowledge}
                className="shrink-0 rounded-lg p-1 text-foreground-muted hover:text-foreground hover:bg-background-secondary transition-colors"
              >
                <X className="h-4 w-4" weight="bold" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <Link
                href="/settings/privacy"
                className="text-[11px] text-accent hover:underline flex items-center gap-1"
              >
                <Info weight="bold" className="h-3 w-3" />
                Zásady ochrany údajů
              </Link>
              <button
                onClick={handleAcknowledge}
                className="rounded-xl bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover active:scale-95 transition-all"
              >
                Rozumím
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
