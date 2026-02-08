"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import {
  MagnifyingGlass,
  Newspaper,
  Storefront,
  Briefcase,
  X,
} from "@phosphor-icons/react";
import { globalSearch, type SearchResult } from "@/actions/search";
import Link from "next/link";

function typeIcon(type: SearchResult["type"]) {
  switch (type) {
    case "post":
      return <Newspaper className="h-4 w-4 text-sky-500" weight="duotone" />;
    case "listing":
      return (
        <Storefront className="h-4 w-4 text-emerald-500" weight="duotone" />
      );
    case "job":
      return (
        <Briefcase className="h-4 w-4 text-violet-500" weight="duotone" />
      );
  }
}

function typeLabel(type: SearchResult["type"]) {
  switch (type) {
    case "post":
      return "Článek";
    case "listing":
      return "Inzerát";
    case "job":
      return "Nabídka práce";
  }
}

export function SearchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setResults([]);
      setSearched(false);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await globalSearch(value);
        setResults(res);
        setSearched(true);
      });
    }, 300);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative mx-auto mt-[10vh] w-[90%] max-w-lg animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <MagnifyingGlass
              className="h-5 w-5 text-foreground-muted shrink-0"
              weight="bold"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Hledat články, inzeráty, nabídky…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground-muted outline-none"
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => handleChange("")}
                aria-label="Smazat hledání"
                className="text-foreground-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto">
            {isPending && (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground-muted border-t-brand" />
              </div>
            )}

            {!isPending && searched && results.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-foreground-muted">
                Žádné výsledky pro &ldquo;{query}&rdquo;
              </div>
            )}

            {!isPending && results.length > 0 && (
              <ul className="py-2">
                {results.map((r) => (
                  <li key={`${r.type}-${r.id}`}>
                    <Link
                      href={r.link}
                      onClick={onClose}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-background-secondary transition-colors"
                    >
                      <span className="mt-0.5">{typeIcon(r.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {r.title}
                        </p>
                        <p className="text-xs text-foreground-muted line-clamp-2 mt-0.5">
                          {r.excerpt}
                        </p>
                        <span className="text-[10px] text-foreground-muted mt-1 inline-block">
                          {typeLabel(r.type)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {!isPending && !searched && (
              <div className="px-4 py-6 text-center text-xs text-foreground-muted">
                Začněte psát pro vyhledávání
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
