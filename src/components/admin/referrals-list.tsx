"use client";

// ============================================================================
// ReferralsList — admin view of all job referrals
// ============================================================================

import { useEffect, useState } from "react";
import { getAllJobs } from "@/actions/job-queries";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  UserPlus,
  Briefcase,
  Mail,
  Phone,
  FileText,
  Loader2,
  Inbox,
} from "lucide-react";

type Referral = {
  id: string;
  candidateName: string;
  candidateEmail: string | null;
  candidatePhone: string | null;
  note: string | null;
  status: string;
  createdAt: Date;
  referrer: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
};

type JobWithReferrals = {
  id: string;
  title: string;
  status: string;
  referrals: Referral[];
  _count: { referrals: number };
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  SUBMITTED: { label: "Odesláno", color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30" },
  INTERVIEWING: { label: "Pohovor", color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30" },
  HIRED: { label: "Přijat/a", color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30" },
  REJECTED: { label: "Zamítnut/a", color: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30" },
};

export function ReferralsList() {
  const [jobs, setJobs] = useState<JobWithReferrals[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllJobs()
      .then((data) => setJobs(data as unknown as JobWithReferrals[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
      </div>
    );
  }

  const jobsWithReferrals = jobs.filter((j) => j.referrals.length > 0);
  const totalReferrals = jobsWithReferrals.reduce(
    (sum, j) => sum + j.referrals.length,
    0,
  );

  if (totalReferrals === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
        <Inbox className="mb-3 h-12 w-12 text-foreground-muted" />
        <p className="text-sm font-medium text-foreground-secondary">
          Zatím žádná doporučení
        </p>
        <p className="mt-1 text-xs text-foreground-muted">
          Zaměstnanci mohou doporučovat kandidáty na stránce Volné pozice
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold text-foreground">
          Doporučení kandidátů
        </h2>
        <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent">
          {totalReferrals}
        </span>
      </div>

      {jobsWithReferrals.map((job) => (
        <div
          key={job.id}
          className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
        >
          {/* Job header */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-background-secondary/50">
            <Briefcase className="h-4 w-4 text-foreground-muted shrink-0" />
            <p className="text-sm font-semibold text-foreground truncate">
              {job.title}
            </p>
            <span
              className={cn(
                "ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                job.status === "ACTIVE"
                  ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-background-secondary text-foreground-muted",
              )}
            >
              {job.status === "ACTIVE" ? "Aktivní" : "Neaktivní"}
            </span>
          </div>

          {/* Referrals */}
          <ul className="divide-y divide-border">
            {job.referrals.map((ref) => {
              const st = STATUS_LABELS[ref.status] ?? STATUS_LABELS.SUBMITTED;

              return (
                <li key={ref.id} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {ref.candidateName}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-medium",
                        st.color,
                      )}
                    >
                      {st.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-secondary">
                    {ref.candidateEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {ref.candidateEmail}
                      </span>
                    )}
                    {ref.candidatePhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {ref.candidatePhone}
                      </span>
                    )}
                    <span className="text-foreground-muted">
                      Doporučil/a: {ref.referrer.name ?? "Neznámý"}
                    </span>
                  </div>

                  {ref.note && (
                    <div className="flex items-start gap-1 text-xs text-foreground-muted">
                      <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{ref.note}</span>
                    </div>
                  )}

                  <p className="text-[11px] text-foreground-muted">
                    {formatDistanceToNow(new Date(ref.createdAt), {
                      addSuffix: true,
                      locale: cs,
                    })}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
