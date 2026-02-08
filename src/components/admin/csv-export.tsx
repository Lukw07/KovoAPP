"use client";

import { useState, useTransition } from "react";
import { Download, Calendar } from "lucide-react";
import { getVacationExportData } from "@/actions/admin-queries";

const MONTH_NAMES = [
  "Leden",
  "Únor",
  "Březen",
  "Duben",
  "Květen",
  "Červen",
  "Červenec",
  "Srpen",
  "Září",
  "Říjen",
  "Listopad",
  "Prosinec",
];

export function CsvExport() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const data = await getVacationExportData(year, month);

      if (data.length === 0) {
        alert("Žádná schválená dovolená pro vybraný měsíc.");
        return;
      }

      // BOM for Excel UTF-8 compatibility
      const BOM = "\uFEFF";
      const headers = [
        "Jméno",
        "Email",
        "Oddělení",
        "Kód oddělení",
        "Typ",
        "Datum od",
        "Datum do",
        "Půl den začátek",
        "Půl den konec",
        "Celkem dnů",
      ];

      const rows = data.map((row) =>
        [
          row.jmeno,
          row.email,
          row.oddeleni,
          row.kodOddeleni,
          row.typ,
          row.datumOd,
          row.datumDo,
          row.pulDenZacatek,
          row.pulDenKonec,
          row.celkemDnu.toString(),
        ]
          .map((v) => `"${v.replace(/"/g, '""')}"`)
          .join(";")
      );

      const csv = BOM + headers.join(";") + "\n" + rows.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dovolena_${year}_${String(month + 1).padStart(2, "0")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-foreground-secondary">
          Rok
        </label>
        <input
          type="number"
          min={2020}
          max={2099}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-24 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-foreground-secondary">
          Měsíc
        </label>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={i} value={i}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={handleExport}
        disabled={isPending}
        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 active:scale-95 disabled:opacity-50 transition-all"
      >
        <Download className="h-4 w-4" />
        {isPending ? "Exportuji..." : "Export CSV pro Helios"}
      </button>
      <span className="flex items-center gap-1 text-xs text-foreground-muted">
        <Calendar className="h-3.5 w-3.5" />
        Schválené dovolené za {MONTH_NAMES[month]} {year}
      </span>
    </div>
  );
}
