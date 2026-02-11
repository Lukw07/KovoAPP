"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  MapPin,
  Banknote,
  FileText,
  Clock,
  Share2,
  Award,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Briefcase,
  X,
  Send,
} from "lucide-react";
import { submitReferral } from "@/actions/jobs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface JobData {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  location: string | null;
  salaryRange: string | null;
  contractType: string | null;
  referralBonus: number;
  status: string;
  publishedAt: Date | null;
  closesAt: Date | null;
  _count: { referrals: number };
}

interface JobCardProps {
  job: JobData;
}

export function JobCard({ job }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralSuccess, setReferralSuccess] = useState(false);

  // Share via native share API
  const handleShare = async () => {
    const jobUrl = `https://kovodecin.cz/jobs`;
    const shareData = {
      title: job.title,
      text: `Hledáme: ${job.title}${job.location ? ` (${job.location})` : ""}${job.salaryRange ? ` - ${job.salaryRange}` : ""}`,
      url: jobUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or not supported
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(
        `${shareData.text}\n${jobUrl}`
      );
      toast.success("Odkaz zkopírován do schránky!");
    }
  };

  const handleSubmitReferral = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setReferralError(null);
    setReferralSuccess(false);

    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("jobPostingId", job.id);

    startTransition(async () => {
      const result = await submitReferral(fd);
      if (result.error) {
        setReferralError(result.error);
      } else {
        setReferralSuccess(true);
        form.reset();
        setTimeout(() => setShowReferral(false), 2000);
      }
    });
  };

  const publishedAgo = job.publishedAt
    ? formatDistanceToNow(new Date(job.publishedAt), {
        addSuffix: true,
        locale: cs,
      })
    : null;

  const closesIn = job.closesAt
    ? formatDistanceToNow(new Date(job.closesAt), {
        addSuffix: true,
        locale: cs,
      })
    : null;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-4 space-y-3">
        {/* Title + contract badge */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-foreground leading-snug">
            {job.title}
          </h3>
          {job.contractType && (
            <span className="shrink-0 rounded-full bg-accent-light px-2.5 py-0.5 text-[11px] font-semibold text-accent-text">
              {job.contractType}
            </span>
          )}
        </div>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-2">
          {job.location && (
            <span className="inline-flex items-center gap-1 text-xs text-foreground-secondary">
              <MapPin className="h-3 w-3" />
              {job.location}
            </span>
          )}
          {job.salaryRange && (
            <span className="inline-flex items-center gap-1 text-xs text-foreground-secondary">
              <Banknote className="h-3 w-3" />
              {job.salaryRange}
            </span>
          )}
          {job.referralBonus > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Award className="h-3 w-3" />
              +{job.referralBonus} bodů za doporučení
            </span>
          )}
        </div>

        {/* Description (collapsed) */}
        <div
          className={cn(
            "text-sm text-foreground-secondary whitespace-pre-line",
            !expanded && "line-clamp-3"
          )}
        >
          {job.description}
        </div>

        {/* Requirements (expanded only) */}
        {expanded && job.requirements && (
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Požadavky
            </h4>
            <p className="text-sm text-foreground-secondary whitespace-pre-line">
              {job.requirements}
            </p>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover active:scale-95 transition-all"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Skrýt detail
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Zobrazit detail
            </>
          )}
        </button>

        {/* Action buttons */}
        <div className="flex gap-2 border-t border-border pt-3">
          <button
            onClick={handleShare}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5",
              "border border-border text-sm font-medium text-foreground",
              "hover:bg-background-secondary active:scale-[0.98] transition-all"
            )}
          >
            <Share2 className="h-4 w-4" />
            Sdílet pozici
          </button>
          <button
            onClick={() => setShowReferral(!showReferral)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5",
              "bg-emerald-600 text-sm font-medium text-white shadow-sm",
              "hover:bg-emerald-700 active:scale-[0.98] transition-all",
              showReferral && "bg-slate-600 hover:bg-slate-700"
            )}
          >
            <UserPlus className="h-4 w-4" />
            {showReferral ? "Zavřít" : "Doporučit známého"}
          </button>
        </div>

        {/* Footer meta */}
        <div className="flex items-center justify-between text-[11px] text-foreground-muted">
          {publishedAgo && <span>Publikováno {publishedAgo}</span>}
          {closesIn && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Uzávěrka {closesIn}
            </span>
          )}
        </div>
      </div>

      {/* Referral form (expandable) */}
      {showReferral && (
        <div className="border-t border-border bg-background-secondary p-4">
          <form onSubmit={handleSubmitReferral} className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">
              Doporučit kandidáta
            </h4>

            <input
              name="candidateName"
              required
              placeholder="Jméno kandidáta *"
              className={cn(
                "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground",
                "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              )}
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                name="candidateEmail"
                type="email"
                placeholder="Email"
                className={cn(
                  "rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground",
                  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                )}
              />
              <input
                name="candidatePhone"
                type="tel"
                placeholder="Telefon"
                className={cn(
                  "rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground",
                  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                )}
              />
            </div>

            <textarea
              name="note"
              rows={2}
              placeholder="Poznámka (volitelné)"
              className={cn(
                "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm resize-none text-foreground",
                "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              )}
            />

            {referralError && (
              <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2">
                {referralError}
              </p>
            )}
            {referralSuccess && (
              <p className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg px-3 py-2">
                Doporučení úspěšně odesláno! 🎉
              </p>
            )}

            {/* GDPR consent */}
            <label className="flex items-start gap-2 rounded-xl border border-border bg-background p-3 cursor-pointer">
              <input
                type="checkbox"
                name="gdprConsent"
                required
                className="mt-0.5 h-4 w-4 rounded border-border accent-accent shrink-0"
              />
              <span className="text-[11px] text-foreground-secondary leading-tight">
                Potvrzuji, že mám souhlas doporučeného kandidáta se zpracováním
                jeho osobních údajů za účelem náboru dle GDPR.
              </span>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowReferral(false)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground-secondary hover:bg-background-secondary active:scale-[0.98] transition-all"
              >
                <X className="inline h-4 w-4 mr-1" />
                Zrušit
              </button>
              <button
                type="submit"
                disabled={isPending}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5",
                  "bg-emerald-600 text-sm font-semibold text-white",
                  "hover:bg-emerald-700 active:scale-[0.98] transition-all",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Send className="h-4 w-4" />
                {isPending ? "Odesílám..." : "Odeslat"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// JOB LIST
// ---------------------------------------------------------------------------

interface JobListProps {
  jobs: JobData[];
}

export function JobList({ jobs }: JobListProps) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
        <Briefcase className="mb-3 h-12 w-12 text-foreground-muted" />
        <p className="text-sm font-medium text-foreground-secondary">
          Momentálně žádné otevřené pozice
        </p>
        <p className="mt-1 text-xs text-foreground-muted">
          Sledujte tuto stránku pro nové nabídky
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-4"
      initial="initial"
      animate="animate"
      variants={{
        initial: {},
        animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
      }}
    >
      {jobs.map((job) => (
        <motion.div
          key={job.id}
          variants={{
            initial: { opacity: 0, y: 20, scale: 0.98 },
            animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
          }}
        >
          <JobCard job={job} />
        </motion.div>
      ))}
    </motion.div>
  );
}
