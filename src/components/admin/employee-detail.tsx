"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  CalendarDots,
  CaretDown,
  CheckCircle,
  Clock,
  EnvelopeSimple,
  FileText,
  FirstAid,
  HouseLine,
  Phone,
  Plus,
  Stethoscope,
  User,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { toast } from "sonner";
import {
  createContract,
  createMedicalExam,
  completeMedicalExam,
  upsertVacationEntitlement,
} from "@/actions/employee-management";

// ============================================================================
// Employee Detail — tabbed view with overview, contracts, exams, documents, PTO
// ============================================================================

type Tab = "overview" | "contracts" | "exams" | "documents" | "time-off";

type Employee = Awaited<
  ReturnType<typeof import("@/actions/employee-management").getEmployeeDetail>
>;

interface EmployeeDetailProps {
  employee: Employee;
}

export function EmployeeDetail({ employee }: EmployeeDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Přehled", icon: User },
    { id: "contracts", label: "Smlouvy", icon: Briefcase },
    { id: "exams", label: "Prohlídky", icon: Stethoscope },
    { id: "documents", label: "Dokumenty", icon: FileText },
    { id: "time-off", label: "Volno", icon: CalendarDots },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <Link
          href="/admin/employees"
          className="mt-1 rounded-lg p-1.5 text-foreground-muted hover:bg-background-secondary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white overflow-hidden">
            {employee.avatarUrl ? (
              <img
                src={employee.avatarUrl}
                alt=""
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              employee.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-foreground truncate lg:text-2xl">
              {employee.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-foreground-secondary">
              {employee.position && (
                <span className="truncate">{employee.position}</span>
              )}
              {employee.department && (
                <span
                  className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: employee.department.color
                      ? `${employee.department.color}15`
                      : undefined,
                    color: employee.department.color ?? undefined,
                  }}
                >
                  {employee.department.name}
                </span>
              )}
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium",
                  employee.isActive
                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
                )}
              >
                {employee.isActive ? "Aktivní" : "Neaktivní"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px scrollbar-hide">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium transition-colors",
              activeTab === id
                ? "border-b-2 border-accent text-accent-text"
                : "text-foreground-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ────────────────────────────────────── */}
      {activeTab === "overview" && <OverviewTab employee={employee} />}
      {activeTab === "contracts" && <ContractsTab employee={employee} />}
      {activeTab === "exams" && <ExamsTab employee={employee} />}
      {activeTab === "documents" && <DocumentsTab employee={employee} />}
      {activeTab === "time-off" && <TimeOffTab employee={employee} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Overview Tab
// ═══════════════════════════════════════════════════════════════════════════

function OverviewTab({ employee }: { employee: Employee }) {
  const currentVacation = employee.vacationEntitlements[0];
  const activeContract = employee.contracts.find(
    (c) => c.status === "ACTIVE",
  );
  const nextExam = employee.medicalExams.find(
    (e) => e.status === "SCHEDULED" || e.status === "OVERDUE",
  );

  return (
    <div className="space-y-6">
      {/* Alert section */}
      {nextExam?.status === "OVERDUE" && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4">
          <Warning
            className="h-5 w-5 text-red-500 shrink-0 mt-0.5"
            weight="fill"
          />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Prohlídka po termínu
            </p>
            <p className="text-sm text-red-600/80 dark:text-red-400/80">
              {examTypeLabel(nextExam.type)} prohlídka byla naplánována na{" "}
              {format(new Date(nextExam.scheduledAt), "d. MMMM yyyy", {
                locale: cs,
              })}
            </p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickStat
          icon={FirstAid}
          label="Sick days"
          value={employee.stats.sickDays}
          sub="letos"
          color="text-amber-600 dark:text-amber-400"
        />
        <QuickStat
          icon={Stethoscope}
          label="Dny u lékaře"
          value={employee.stats.doctorDays}
          sub="letos"
          color="text-violet-600 dark:text-violet-400"
        />
        <QuickStat
          icon={HouseLine}
          label="Home office"
          value={employee.stats.homeOfficeDays}
          sub="letos"
          color="text-blue-600 dark:text-blue-400"
        />
        <QuickStat
          icon={User}
          label="Osobní volno"
          value={employee.stats.personalDays}
          sub="letos"
          color="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      {/* Two-column info */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Contact info */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Kontaktní údaje
          </h3>
          <div className="space-y-2 text-sm">
            <InfoRow
              icon={EnvelopeSimple}
              label="E-mail"
              value={employee.email}
            />
            <InfoRow
              icon={Phone}
              label="Telefon"
              value={employee.phone ?? "—"}
            />
            <InfoRow
              icon={CalendarDots}
              label="Nástup"
              value={format(new Date(employee.hireDate), "d. MMMM yyyy", {
                locale: cs,
              })}
            />
            <InfoRow
              icon={User}
              label="Role"
              value={roleLabel(employee.role)}
            />
          </div>
        </div>

        {/* Current contract */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Aktuální smlouva
          </h3>
          {activeContract ? (
            <div className="space-y-2 text-sm">
              <InfoRow
                icon={Briefcase}
                label="Typ"
                value={contractTypeLabel(activeContract.type)}
              />
              <InfoRow
                icon={User}
                label="Pozice"
                value={activeContract.position}
              />
              <InfoRow
                icon={CalendarDots}
                label="Od"
                value={format(
                  new Date(activeContract.startDate),
                  "d. M. yyyy",
                  { locale: cs },
                )}
              />
              <InfoRow
                icon={CalendarDots}
                label="Do"
                value={
                  activeContract.endDate
                    ? format(
                        new Date(activeContract.endDate),
                        "d. M. yyyy",
                        { locale: cs },
                      )
                    : "Na dobu neurčitou"
                }
              />
              <InfoRow
                icon={Clock}
                label="Úvazek"
                value={`${activeContract.hoursPerWeek}h / týden`}
              />
            </div>
          ) : (
            <p className="text-sm text-foreground-muted">
              Žádná aktivní smlouva
            </p>
          )}
        </div>

        {/* Vacation balance */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Dovolená {new Date().getFullYear()}
          </h3>
          {currentVacation ? (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-foreground-secondary">
                  Čerpáno {currentVacation.usedDays} z{" "}
                  {currentVacation.totalDays + currentVacation.carriedOver} dnů
                </span>
                <span className="font-medium text-foreground">
                  {currentVacation.totalDays +
                    currentVacation.carriedOver -
                    currentVacation.usedDays}{" "}
                  zbývá
                </span>
              </div>
              <div className="h-2 rounded-full bg-background-tertiary overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{
                    width: `${Math.min(100, (currentVacation.usedDays / (currentVacation.totalDays + currentVacation.carriedOver)) * 100)}%`,
                  }}
                />
              </div>
              {currentVacation.carriedOver > 0 && (
                <p className="mt-1 text-xs text-foreground-muted">
                  Včetně {currentVacation.carriedOver} převedených dnů
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-foreground-muted">
              Nárok na dovolenou není nastaven
            </p>
          )}
        </div>

        {/* Next medical exam */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Příští prohlídka
          </h3>
          {employee.medicalExams.find(
            (e) => e.status === "SCHEDULED" || e.status === "OVERDUE",
          ) ? (
            (() => {
              const exam = employee.medicalExams.find(
                (e) => e.status === "SCHEDULED" || e.status === "OVERDUE",
              )!;
              return (
                <div className="space-y-2 text-sm">
                  <InfoRow
                    icon={Stethoscope}
                    label="Typ"
                    value={examTypeLabel(exam.type)}
                  />
                  <InfoRow
                    icon={CalendarDots}
                    label="Termín"
                    value={format(
                      new Date(exam.scheduledAt),
                      "d. MMMM yyyy",
                      { locale: cs },
                    )}
                  />
                  {exam.doctorName && (
                    <InfoRow
                      icon={User}
                      label="Lékař"
                      value={exam.doctorName}
                    />
                  )}
                  <div className="pt-1">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                        exam.status === "OVERDUE"
                          ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                          : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
                      )}
                    >
                      {exam.status === "OVERDUE" ? (
                        <Warning className="h-3 w-3" weight="fill" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      {examStatusLabel(exam.status)}
                    </span>
                  </div>
                </div>
              );
            })()
          ) : (
            <p className="text-sm text-foreground-muted">
              Žádná naplánovaná prohlídka
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Contracts Tab
// ═══════════════════════════════════════════════════════════════════════════

function ContractsTab({ employee }: { employee: Employee }) {
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleCreateContract(formData: FormData) {
    startTransition(async () => {
      try {
        const result = await createContract({
          userId: employee.id,
          type: formData.get("type") as "HPP" | "DPP" | "DPC",
          startDate: new Date(
            formData.get("startDate") as string,
          ).toISOString(),
          endDate: formData.get("endDate")
            ? new Date(formData.get("endDate") as string).toISOString()
            : undefined,
          position: formData.get("position") as string,
          hoursPerWeek: Number(formData.get("hoursPerWeek") ?? 40),
          note: (formData.get("note") as string) || undefined,
        });
        if (result.success) {
          toast.success("Smlouva vytvořena");
          setShowForm(false);
          router.refresh();
        }
      } catch {
        toast.error("Nepodařilo se vytvořit smlouvu");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Smlouvy ({employee.contracts.length})
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Nová smlouva
        </button>
      </div>

      {showForm && (
        <form
          action={handleCreateContract}
          className="rounded-xl border border-border bg-card p-4 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">
                Typ smlouvy *
              </label>
              <select
                name="type"
                required
                className="w-full rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              >
                <option value="HPP">HPP — Hlavní pracovní poměr</option>
                <option value="DPP">DPP — Dohoda o provedení práce</option>
                <option value="DPC">DPČ — Dohoda o pracovní činnosti</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">
                Pozice *
              </label>
              <input
                name="position"
                required
                className="w-full rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">
                Datum zahájení *
              </label>
              <input
                name="startDate"
                type="date"
                required
                className="w-full rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">
                Datum ukončení
              </label>
              <input
                name="endDate"
                type="date"
                className="w-full rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
              <p className="text-[10px] text-foreground-muted mt-0.5">
                Nevyplňujte pro dobu neurčitou
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">
                Hodin/týden
              </label>
              <input
                name="hoursPerWeek"
                type="number"
                defaultValue={40}
                min={1}
                max={60}
                className="w-full rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-secondary mb-1">
              Poznámka
            </label>
            <textarea
              name="note"
              rows={2}
              className="w-full rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {pending ? "Ukládám…" : "Vytvořit"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground-secondary hover:bg-background-secondary transition-colors"
            >
              Zrušit
            </button>
          </div>
        </form>
      )}

      {/* Contract list */}
      <div className="space-y-2">
        {employee.contracts.length === 0 ? (
          <p className="py-8 text-center text-sm text-foreground-muted">
            Žádné smlouvy
          </p>
        ) : (
          employee.contracts.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {contractTypeLabel(c.type)}
                  </span>
                  <ContractStatusBadge status={c.status} />
                </div>
                {c.documentUrl && (
                  <a
                    href={c.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent-text hover:underline"
                  >
                    Dokument
                  </a>
                )}
              </div>
              <p className="mt-1 text-sm text-foreground-secondary">
                {c.position}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-muted">
                <span>
                  Od:{" "}
                  {format(new Date(c.startDate), "d. M. yyyy", { locale: cs })}
                </span>
                <span>
                  Do:{" "}
                  {c.endDate
                    ? format(new Date(c.endDate), "d. M. yyyy", { locale: cs })
                    : "neurčito"}
                </span>
                <span>{c.hoursPerWeek}h/týden</span>
              </div>
              {c.note && (
                <p className="mt-1.5 text-xs text-foreground-muted italic">
                  {c.note}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Medical Exams Tab
// ═══════════════════════════════════════════════════════════════════════════

function ExamsTab({ employee }: { employee: Employee }) {
  const [showForm, setShowForm] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleCreateExam(formData: FormData) {
    startTransition(async () => {
      try {
        await createMedicalExam({
          userId: employee.id,
          type: formData.get("type") as
            | "VSTUPNI"
            | "PERIODICKY"
            | "MIMORADNA"
            | "VYSTUPNI"
            | "NASLEDNA",
          scheduledAt: new Date(
            formData.get("scheduledAt") as string,
          ).toISOString(),
          doctorName: (formData.get("doctorName") as string) || undefined,
          note: (formData.get("note") as string) || undefined,
        });
        toast.success("Prohlídka naplánována");
        setShowForm(false);
        router.refresh();
      } catch {
        toast.error("Nepodařila se naplánovat prohlídka");
      }
    });
  }

  async function handleComplete(formData: FormData) {
    const examId = formData.get("examId") as string;
    const result = formData.get("result") as string;
    const nextDueAt = formData.get("nextDueAt") as string;

    startTransition(async () => {
      try {
        await completeMedicalExam(
          examId,
          result,
          nextDueAt ? new Date(nextDueAt).toISOString() : undefined,
        );
        toast.success("Prohlídka dokončena");
        setCompleting(null);
        router.refresh();
      } catch {
        toast.error("Chyba při dokončení prohlídky");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Lékařské prohlídky ({employee.medicalExams.length})
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Naplánovat
        </button>
      </div>

      {showForm && (
        <form
          action={handleCreateExam}
          className="rounded-xl border border-border bg-card p-4 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">
                Typ prohlídky *
              </label>
              <select
                name="type"
                required
                className="w-full rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              >
                <option value="VSTUPNI">Vstupní</option>
                <option value="PERIODICKY">Periodická</option>
                <option value="MIMORADNA">Mimořádná</option>
                <option value="VYSTUPNI">Výstupní</option>
                <option value="NASLEDNA">Následná</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">
                Termín *
              </label>
              <input
                name="scheduledAt"
                type="date"
                required
                className="w-full rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">
                Lékař
              </label>
              <input
                name="doctorName"
                className="w-full rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-secondary mb-1">
              Poznámka
            </label>
            <textarea
              name="note"
              rows={2}
              className="w-full rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {pending ? "Ukládám…" : "Naplánovat"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground-secondary hover:bg-background-secondary transition-colors"
            >
              Zrušit
            </button>
          </div>
        </form>
      )}

      {/* Exams list */}
      <div className="space-y-2">
        {employee.medicalExams.length === 0 ? (
          <p className="py-8 text-center text-sm text-foreground-muted">
            Žádné prohlídky
          </p>
        ) : (
          employee.medicalExams.map((exam) => (
            <div
              key={exam.id}
              className={cn(
                "rounded-xl border bg-card p-4",
                exam.status === "OVERDUE"
                  ? "border-red-200 dark:border-red-900/50"
                  : "border-border",
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {examTypeLabel(exam.type)}
                  </span>
                  <ExamStatusBadge status={exam.status} />
                </div>
                {(exam.status === "SCHEDULED" ||
                  exam.status === "OVERDUE") && (
                  <button
                    onClick={() =>
                      setCompleting(
                        completing === exam.id ? null : exam.id,
                      )
                    }
                    className="text-xs text-accent-text hover:underline"
                  >
                    Dokončit
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-muted">
                <span>
                  Termín:{" "}
                  {format(new Date(exam.scheduledAt), "d. M. yyyy", {
                    locale: cs,
                  })}
                </span>
                {exam.completedAt && (
                  <span>
                    Dokončeno:{" "}
                    {format(new Date(exam.completedAt), "d. M. yyyy", {
                      locale: cs,
                    })}
                  </span>
                )}
                {exam.nextDueAt && (
                  <span>
                    Další:{" "}
                    {format(new Date(exam.nextDueAt), "d. M. yyyy", {
                      locale: cs,
                    })}
                  </span>
                )}
                {exam.doctorName && <span>Lékař: {exam.doctorName}</span>}
              </div>
              {exam.result && (
                <p className="mt-1.5 text-xs text-foreground-secondary">
                  Výsledek: {exam.result}
                </p>
              )}
              {exam.note && (
                <p className="mt-1 text-xs text-foreground-muted italic">
                  {exam.note}
                </p>
              )}

              {/* Complete form inline */}
              {completing === exam.id && (
                <form
                  action={handleComplete}
                  className="mt-3 border-t border-border pt-3 space-y-2"
                >
                  <input type="hidden" name="examId" value={exam.id} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-foreground-secondary mb-1">
                        Výsledek *
                      </label>
                      <input
                        name="result"
                        required
                        placeholder="Způsobilý / Nezpůsobilý…"
                        className="w-full rounded-lg border border-border bg-background-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground-secondary mb-1">
                        Příští prohlídka
                      </label>
                      <input
                        name="nextDueAt"
                        type="date"
                        className="w-full rounded-lg border border-border bg-background-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={pending}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                    >
                      {pending ? "Ukládám…" : "Uložit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompleting(null)}
                      className="text-xs text-foreground-muted hover:text-foreground transition-colors"
                    >
                      Zrušit
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Documents Tab
// ═══════════════════════════════════════════════════════════════════════════

function DocumentsTab({ employee }: { employee: Employee }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        Dokumenty ({employee.documents.length})
      </h3>

      {employee.documents.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-muted">
          Žádné dokumenty
        </p>
      ) : (
        <div className="space-y-2">
          {employee.documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start justify-between rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start gap-3 min-w-0">
                <FileText className="h-5 w-5 text-foreground-muted shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {doc.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-muted mt-0.5">
                    <span className="inline-flex items-center rounded bg-background-tertiary px-1.5 py-0.5 text-[10px] font-medium text-foreground-secondary">
                      {documentCategoryLabel(doc.category)}
                    </span>
                    <span>
                      {format(new Date(doc.createdAt), "d. M. yyyy", {
                        locale: cs,
                      })}
                    </span>
                    {doc.expiresAt && (
                      <span
                        className={cn(
                          new Date(doc.expiresAt) < new Date()
                            ? "text-red-500 font-medium"
                            : "",
                        )}
                      >
                        Platnost do:{" "}
                        {format(new Date(doc.expiresAt), "d. M. yyyy", {
                          locale: cs,
                        })}
                      </span>
                    )}
                  </div>
                  {doc.description && (
                    <p className="mt-1 text-xs text-foreground-muted">
                      {doc.description}
                    </p>
                  )}
                </div>
              </div>
              {doc.fileUrl && (
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs text-accent-text hover:underline ml-2"
                >
                  Stáhnout
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Time-Off Tab
// ═══════════════════════════════════════════════════════════════════════════

function TimeOffTab({ employee }: { employee: Employee }) {
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleUpsert(formData: FormData) {
    startTransition(async () => {
      try {
        await upsertVacationEntitlement({
          userId: employee.id,
          year: Number(formData.get("year")),
          totalDays: Number(formData.get("totalDays")),
          carriedOver: Number(formData.get("carriedOver") ?? 0),
        });
        toast.success("Nárok na dovolenou uložen");
        setShowForm(false);
        router.refresh();
      } catch {
        toast.error("Chyba při ukládání");
      }
    });
  }

  // Group hrRequests by type
  const requestsByType = new Map<string, typeof employee.hrRequests>();
  for (const r of employee.hrRequests) {
    const arr = requestsByType.get(r.type) ?? [];
    arr.push(r);
    requestsByType.set(r.type, arr);
  }

  return (
    <div className="space-y-6">
      {/* Vacation entitlement */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Nárok na dovolenou
          </h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nastavit
          </button>
        </div>

        {showForm && (
          <form
            action={handleUpsert}
            className="mt-3 rounded-xl border border-border bg-card p-4 space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-foreground-secondary mb-1">
                  Rok *
                </label>
                <input
                  name="year"
                  type="number"
                  required
                  defaultValue={new Date().getFullYear()}
                  min={2020}
                  max={2040}
                  className="w-full rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-secondary mb-1">
                  Celkem dní *
                </label>
                <input
                  name="totalDays"
                  type="number"
                  required
                  defaultValue={20}
                  min={0}
                  max={60}
                  className="w-full rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-secondary mb-1">
                  Převedeno
                </label>
                <input
                  name="carriedOver"
                  type="number"
                  defaultValue={0}
                  min={0}
                  max={30}
                  className="w-full rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {pending ? "Ukládám…" : "Uložit"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-foreground-secondary hover:bg-background-secondary transition-colors"
              >
                Zrušit
              </button>
            </div>
          </form>
        )}

        <div className="mt-3 space-y-2">
          {employee.vacationEntitlements.length === 0 ? (
            <p className="text-sm text-foreground-muted">
              Nárok není nastaven
            </p>
          ) : (
            employee.vacationEntitlements.map((v) => (
              <div
                key={v.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {v.year}
                  </span>
                  <span className="text-sm tabular-nums text-foreground-secondary">
                    {v.totalDays + v.carriedOver - v.usedDays} /{" "}
                    {v.totalDays + v.carriedOver} zbývá
                  </span>
                </div>
                <div className="h-2 rounded-full bg-background-tertiary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{
                      width: `${Math.min(100, (v.usedDays / (v.totalDays + v.carriedOver)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-1.5 flex gap-4 text-xs text-foreground-muted">
                  <span>Nárok: {v.totalDays}d</span>
                  {v.carriedOver > 0 && (
                    <span>Převedeno: {v.carriedOver}d</span>
                  )}
                  <span>Čerpáno: {v.usedDays}d</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* HR Requests this year */}
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Žádosti {new Date().getFullYear()}
        </h3>
        <div className="mt-3 space-y-2">
          {employee.hrRequests.length === 0 ? (
            <p className="text-sm text-foreground-muted">
              Žádné žádosti za tento rok
            </p>
          ) : (
            employee.hrRequests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <RequestTypeIcon type={r.type} />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {requestTypeLabel(r.type)}
                    </p>
                    <p className="text-xs text-foreground-muted">
                      {format(new Date(r.startDate), "d. M.", { locale: cs })}
                      {r.endDate &&
                        ` – ${format(new Date(r.endDate), "d. M.", { locale: cs })}`}
                      {r.totalDays > 0 && ` · ${r.totalDays}d`}
                    </p>
                  </div>
                </div>
                <RequestStatusBadge status={r.status} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared subcomponents & helpers
// ═══════════════════════════════════════════════════════════════════════════

function QuickStat({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", color)} weight="bold" />
        <span className="text-xs font-medium text-foreground-secondary">
          {label}
        </span>
      </div>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", color)}>
        {value}
      </p>
      <p className="text-[10px] text-foreground-muted">{sub}</p>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-foreground-muted shrink-0" />
      <span className="text-foreground-muted w-20 shrink-0">{label}</span>
      <span className="text-foreground truncate">{value}</span>
    </div>
  );
}

function ContractStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE:
      "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
    EXPIRED:
      "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    TERMINATED:
      "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium",
        map[status] ?? map.ACTIVE,
      )}
    >
      {status === "ACTIVE"
        ? "Aktivní"
        : status === "EXPIRED"
          ? "Vypršela"
          : "Ukončena"}
    </span>
  );
}

function ExamStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    SCHEDULED:
      "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    COMPLETED:
      "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
    OVERDUE:
      "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    CANCELLED:
      "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
        map[status] ?? map.SCHEDULED,
      )}
    >
      {examStatusLabel(status)}
    </span>
  );
}

function RequestStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    APPROVED:
      "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
    PENDING:
      "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
    REJECTED:
      "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium",
        map[status] ?? map.PENDING,
      )}
    >
      {status === "APPROVED"
        ? "Schváleno"
        : status === "PENDING"
          ? "Čeká"
          : "Zamítnuto"}
    </span>
  );
}

function RequestTypeIcon({ type }: { type: string }) {
  const cls = "h-4 w-4 shrink-0";
  switch (type) {
    case "SICK_DAY":
      return <FirstAid className={cn(cls, "text-amber-500")} weight="bold" />;
    case "DOCTOR":
      return (
        <Stethoscope className={cn(cls, "text-violet-500")} weight="bold" />
      );
    case "HOME_OFFICE":
      return (
        <HouseLine className={cn(cls, "text-blue-500")} weight="bold" />
      );
    case "PERSONAL_DAY":
      return <User className={cn(cls, "text-emerald-500")} weight="bold" />;
    default:
      return (
        <CalendarDots
          className={cn(cls, "text-foreground-muted")}
          weight="bold"
        />
      );
  }
}

// ── Label helpers ─────────────────────────────────────────────────

function contractTypeLabel(type: string): string {
  switch (type) {
    case "HPP":
      return "Hlavní pracovní poměr";
    case "DPP":
      return "Dohoda o provedení práce";
    case "DPC":
      return "Dohoda o pracovní činnosti";
    default:
      return type;
  }
}

function examTypeLabel(type: string): string {
  switch (type) {
    case "VSTUPNI":
      return "Vstupní";
    case "PERIODICKY":
      return "Periodická";
    case "MIMORADNA":
      return "Mimořádná";
    case "VYSTUPNI":
      return "Výstupní";
    case "NASLEDNA":
      return "Následná";
    default:
      return type;
  }
}

function examStatusLabel(status: string): string {
  switch (status) {
    case "SCHEDULED":
      return "Naplánována";
    case "COMPLETED":
      return "Dokončena";
    case "OVERDUE":
      return "Po termínu";
    case "CANCELLED":
      return "Zrušena";
    default:
      return status;
  }
}

function documentCategoryLabel(category: string): string {
  switch (category) {
    case "CONTRACT":
      return "Smlouva";
    case "MEDICAL":
      return "Lékařské";
    case "TRAINING":
      return "Školení";
    case "CERTIFICATION":
      return "Certifikát";
    case "ID_CARD":
      return "Průkaz";
    case "OTHER":
      return "Ostatní";
    default:
      return category;
  }
}

function requestTypeLabel(type: string): string {
  switch (type) {
    case "SICK_DAY":
      return "Sick day";
    case "DOCTOR":
      return "Lékař";
    case "HOME_OFFICE":
      return "Home office";
    case "PERSONAL_DAY":
      return "Osobní volno";
    case "VACATION":
      return "Dovolená";
    default:
      return type;
  }
}

function roleLabel(role: string): string {
  switch (role) {
    case "ADMIN":
      return "Administrátor";
    case "MANAGER":
      return "Manažer";
    case "EMPLOYEE":
      return "Zaměstnanec";
    default:
      return role;
  }
}
