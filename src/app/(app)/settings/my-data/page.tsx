"use client";

// ============================================================================
// My Data — GDPR self-service page (Art. 15, 17, 20)
// ============================================================================

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  DownloadSimple,
  Trash,
  FileText,
  Export,
  ShieldCheck,
  WarningCircle,
  Info,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "sonner";
import { exportMyData, requestAccountDeletion } from "@/actions/my-data";

export default function MyDataPage() {
  const [isPending, startTransition] = useTransition();
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deletionRequested, setDeletionRequested] = useState(false);

  // ----- Export handlers -----

  function handleExportJSON() {
    startTransition(async () => {
      try {
        const data = await exportMyData();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        downloadBlob(blob, `kovo-moje-data-${formatDate()}.json`);
        toast.success("Data exportována ve formátu JSON");
      } catch {
        toast.error("Nepodařilo se exportovat data");
      }
    });
  }

  function handleExportCSV() {
    startTransition(async () => {
      try {
        const data = await exportMyData();
        const csv = convertToCSV(data.personalData);
        const blob = new Blob(["\uFEFF" + csv], {
          type: "text/csv;charset=utf-8",
        });
        downloadBlob(blob, `kovo-moje-data-${formatDate()}.csv`);
        toast.success("Data exportována ve formátu CSV");
      } catch {
        toast.error("Nepodařilo se exportovat data");
      }
    });
  }

  function handleDeleteRequest() {
    startTransition(async () => {
      try {
        const result = await requestAccountDeletion(deleteReason || undefined);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        setDeleteDialog(false);
        setDeletionRequested(true);
        toast.success(result.message);
      } catch {
        toast.error("Nepodařilo se odeslat žádost");
      }
    });
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background-secondary text-foreground-secondary hover:bg-background-tertiary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" weight="bold" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Moje data</h1>
          <p className="text-xs text-foreground-muted">
            Správa osobních údajů dle GDPR
          </p>
        </div>
      </div>

      {/* GDPR info banner */}
      <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 flex items-start gap-3">
        <ShieldCheck
          weight="fill"
          className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5"
        />
        <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <p className="font-semibold">Vaše práva dle GDPR</p>
          <p>
            Máte právo na přístup (čl. 15), přenositelnost (čl. 20) a výmaz
            (čl. 17) svých osobních údajů. Kompletní informace najdete v{" "}
            <Link
              href="/settings/privacy"
              className="underline hover:text-blue-900 dark:hover:text-blue-100"
            >
              Zásadách ochrany osobních údajů
            </Link>
            .
          </p>
        </div>
      </div>

      {/* ── Data Export (Art. 15 + 20) ──────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <Export
              weight="fill"
              className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Export osobních údajů
            </p>
            <p className="text-xs text-foreground-secondary">
              Stáhněte si kopii všech dat, která o vás evidujeme
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-background border border-border p-3 space-y-1.5 text-xs text-foreground-muted">
          <p className="font-medium text-foreground-secondary">
            Export obsahuje:
          </p>
          <ul className="list-disc list-inside space-y-0.5 pl-1">
            <li>Profil a kontaktní údaje</li>
            <li>Pracovní smlouvy a pozice</li>
            <li>Žádosti o dovolenou a nepřítomnost</li>
            <li>Nárok na dovolenou (hodiny/dny)</li>
            <li>Rezervace</li>
            <li>Body, odměny a doporučení</li>
            <li>Dokumenty a lékařské prohlídky (typy)</li>
            <li>Registrovaná zařízení</li>
          </ul>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleExportJSON}
            loading={isPending}
          >
            <FileText weight="bold" className="h-4 w-4" />
            Export JSON
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExportCSV}
            loading={isPending}
          >
            <DownloadSimple weight="bold" className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── Account Deletion (Art. 17) ─────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <Trash
              weight="fill"
              className="h-5 w-5 text-red-600 dark:text-red-400"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Žádost o výmaz účtu
            </p>
            <p className="text-xs text-foreground-secondary">
              Požádejte o smazání všech svých osobních dat
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
          <WarningCircle
            weight="fill"
            className="h-4 w-4 shrink-0 mt-0.5"
          />
          <div>
            <p className="font-semibold">Tuto akci nelze vrátit</p>
            <p>
              Po schválení budou smazány všechny vaše údaje: profil, zprávy,
              žádosti, smlouvy, dokumenty a další. Správce žádost zpracuje do 30
              dnů.
            </p>
          </div>
        </div>

        {deletionRequested ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3 text-xs text-emerald-700 dark:text-emerald-300">
            <Info weight="fill" className="h-4 w-4 shrink-0" />
            Vaše žádost o výmaz byla odeslána. Bude zpracována do 30 dnů.
          </div>
        ) : (
          <Button
            size="sm"
            variant="danger"
            onClick={() => setDeleteDialog(true)}
          >
            <Trash weight="bold" className="h-4 w-4" />
            Požádat o výmaz účtu
          </Button>
        )}
      </div>

      {/* Delete dialog */}
      <Dialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        title="Žádost o výmaz účtu"
        confirmLabel="Odeslat žádost"
        confirmVariant="danger"
        onConfirm={handleDeleteRequest}
        loading={isPending}
      >
        <div className="space-y-3">
          <p className="text-sm text-foreground-secondary">
            Opravdu chcete požádat o smazání svého účtu a všech osobních dat?
            Správce zpracuje vaši žádost do 30 dnů dle čl. 17 GDPR.
          </p>
          <div>
            <label
              htmlFor="delete-reason"
              className="block text-xs font-medium text-foreground-secondary mb-1.5"
            >
              Důvod (volitelné)
            </label>
            <textarea
              id="delete-reason"
              rows={3}
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Napište důvod žádosti..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDate() {
  return new Date().toISOString().slice(0, 10);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertToCSV(data: any): string {
  const rows: string[] = [];

  // Personal info flat fields
  rows.push("=== OSOBNÍ ÚDAJE ===");
  rows.push("Pole,Hodnota");
  const flat = ["id", "name", "email", "role", "position", "phone", "hireDate", "isActive", "pointsBalance", "workFundType", "createdAt"];
  for (const key of flat) {
    rows.push(`"${key}","${data[key] ?? ""}"`);
  }
  if (data.department) {
    rows.push(`"oddělení","${data.department.name ?? ""} (${data.department.code ?? ""})"`);
  }

  // Vacation entitlements
  if (data.vacationEntitlements?.length) {
    rows.push("");
    rows.push("=== NÁROK NA DOVOLENOU ===");
    rows.push("Rok,Celkem dní,Čerpáno dní,Převedeno dní,Celkem hodin,Čerpáno hodin,Převedeno hodin");
    for (const v of data.vacationEntitlements) {
      rows.push(`${v.year},${v.totalDays},${v.usedDays},${v.carriedOver},${v.totalHours},${v.usedHours},${v.carriedOverHours}`);
    }
  }

  // HR requests
  if (data.hrRequests?.length) {
    rows.push("");
    rows.push("=== ŽÁDOSTI ===");
    rows.push("Typ,Stav,Od,Do,Hodin,Důvod,Vytvořeno");
    for (const r of data.hrRequests) {
      rows.push(`"${r.type}","${r.status}","${r.startDate ?? ""}","${r.endDate ?? ""}",${r.totalHours ?? ""},"${(r.reason ?? "").replace(/"/g, '""')}","${r.createdAt ?? ""}"`);
    }
  }

  // Contracts
  if (data.contracts?.length) {
    rows.push("");
    rows.push("=== SMLOUVY ===");
    rows.push("Typ,Stav,Od,Do,Pozice,Hodin/týden");
    for (const c of data.contracts) {
      rows.push(`"${c.type}","${c.status}","${c.startDate ?? ""}","${c.endDate ?? ""}","${c.position}",${c.hoursPerWeek}`);
    }
  }

  // Reservations
  if (data.reservations?.length) {
    rows.push("");
    rows.push("=== REZERVACE ===");
    rows.push("Zdroj,Typ,Stav,Od,Do,Poznámka");
    for (const r of data.reservations) {
      rows.push(`"${r.resource?.name ?? ""}","${r.resource?.type ?? ""}","${r.status}","${r.startTime}","${r.endTime}","${(r.note ?? "").replace(/"/g, '""')}"`);
    }
  }

  // Points
  if (data.pointsHistory?.length) {
    rows.push("");
    rows.push("=== BODY ===");
    rows.push("Body,Důvod,Typ,Datum");
    for (const p of data.pointsHistory) {
      rows.push(`${p.amount},"${(p.reason ?? "").replace(/"/g, '""')}","${p.type}","${p.createdAt}"`);
    }
  }

  return rows.join("\n");
}
