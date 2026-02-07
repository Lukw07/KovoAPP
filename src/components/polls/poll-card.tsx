"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import {
  BarChart3,
  Check,
  Clock,
  Lock,
  Users,
  User,
  Ban,
} from "lucide-react";
import { voteInPoll } from "@/actions/polls";
import { cn } from "@/lib/utils";

interface PollOption {
  index: number;
  text: string;
  count: number;
}

export interface PollData {
  id: string;
  question: string;
  description: string | null;
  isAnonymous: boolean;
  isMultiple: boolean;
  isActive: boolean;
  activeUntil: Date | null;
  createdAt: Date;
  creator: { id: string; name: string | null; avatarUrl: string | null };
  options: PollOption[];
  totalVotes: number;
  userVotes: number[];
  hasVoted: boolean;
}

interface PollCardProps {
  poll: PollData;
  onVoted?: () => void;
}

export function PollCard({ poll, onVoted }: PollCardProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [localUserVotes, setLocalUserVotes] = useState<number[]>(
    poll.userVotes
  );
  const [localOptions, setLocalOptions] = useState<PollOption[]>(poll.options);
  const [localTotalVotes, setLocalTotalVotes] = useState(poll.totalVotes);
  const hasVoted = localUserVotes.length > 0;
  const showResults = hasVoted || !poll.isActive;

  const handleVote = (optionIndex: number) => {
    if (!poll.isActive || isPending) return;
    if (!poll.isMultiple && hasVoted) return;
    if (localUserVotes.includes(optionIndex)) return;

    setError(null);
    startTransition(async () => {
      const result = await voteInPoll(poll.id, optionIndex);
      if (result.error) {
        setError(result.error);
      } else {
        // Optimistic update
        setLocalUserVotes((prev) => [...prev, optionIndex]);
        setLocalOptions((prev) =>
          prev.map((opt) =>
            opt.index === optionIndex
              ? { ...opt, count: opt.count + 1 }
              : opt
          )
        );
        setLocalTotalVotes((prev) => prev + 1);
        onVoted?.();
      }
    });
  };

  const timeInfo = poll.activeUntil
    ? formatDistanceToNow(new Date(poll.activeUntil), {
        addSuffix: true,
        locale: cs,
      })
    : null;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white dark:bg-slate-800 shadow-sm overflow-hidden",
        poll.isActive ? "border-slate-200 dark:border-slate-700" : "border-slate-100 dark:border-slate-800 opacity-75"
      )}
    >
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {poll.question}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              {poll.isAnonymous && (
                <span
                  className="flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500"
                  title="Anonymní hlasování"
                >
                  <Lock className="h-3 w-3" />
                </span>
              )}
              {!poll.isActive && (
                <span className="flex items-center gap-0.5 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                  <Ban className="h-3 w-3" />
                  Ukončeno
                </span>
              )}
            </div>
          </div>
          {poll.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{poll.description}</p>
          )}
        </div>

        {/* Options */}
        <div className="space-y-2">
          {localOptions.map((option) => {
            const percentage =
              localTotalVotes > 0
                ? Math.round((option.count / localTotalVotes) * 100)
                : 0;
            const isSelected = localUserVotes.includes(option.index);

            return (
              <button
                key={option.index}
                onClick={() => handleVote(option.index)}
                disabled={
                  isPending ||
                  !poll.isActive ||
                  (!poll.isMultiple && hasVoted) ||
                  isSelected
                }
                className={cn(
                  "relative w-full text-left rounded-xl border p-3 transition-all overflow-hidden",
                  "active:scale-[0.99]",
                  isSelected
                    ? "border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30"
                    : poll.isActive && !hasVoted
                      ? "border-slate-200 dark:border-slate-600 hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer"
                      : "border-slate-100 dark:border-slate-700 cursor-default"
                )}
              >
                {/* Progress bar background */}
                {showResults && (
                  <div
                    className={cn(
                      "absolute inset-0 rounded-xl transition-all duration-500",
                      isSelected ? "bg-blue-100/50 dark:bg-blue-900/30" : "bg-slate-100/50 dark:bg-slate-700/30"
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                )}

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <Check className="h-4 w-4 text-blue-600 shrink-0" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        isSelected
                          ? "font-semibold text-blue-900 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300"
                      )}
                    >
                      {option.text}
                    </span>
                  </div>

                  {showResults && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {option.count}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-bold",
                          isSelected ? "text-blue-700" : "text-slate-600"
                        )}
                      >
                        {percentage}%
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Footer: meta info */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
              {poll.creator.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={poll.creator.avatarUrl}
                  alt=""
                  className="h-5 w-5 rounded-full"
                />
              ) : (
                <User className="h-3 w-3 text-slate-400" />
              )}
            </div>
            <span>{poll.creator.name}</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {localTotalVotes} {localTotalVotes === 1 ? "hlas" : localTotalVotes < 5 ? "hlasy" : "hlasů"}
            </span>
            {poll.isActive && timeInfo && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeInfo}
              </span>
            )}
          </div>
        </div>

        {/* Multi-vote hint */}
        {poll.isMultiple && poll.isActive && !hasVoted && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
            Můžete vybrat více možností
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// POLLS LIST
// ---------------------------------------------------------------------------

interface PollsListProps {
  polls: PollData[];
}

export function PollsList({ polls }: PollsListProps) {
  const [filter, setFilter] = useState<"active" | "closed" | "all">("active");

  const filtered = polls.filter((p) => {
    if (filter === "active") return p.isActive;
    if (filter === "closed") return !p.isActive;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Ankety</h1>
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5">
          {(
            [
              { key: "active", label: "Aktivní" },
              { key: "closed", label: "Ukončené" },
              { key: "all", label: "Vše" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-medium transition-all",
                filter === tab.key
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-16 text-center">
          <BarChart3 className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {filter === "active"
              ? "Žádné aktivní ankety"
              : filter === "closed"
                ? "Žádné ukončené ankety"
                : "Žádné ankety"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      )}
    </div>
  );
}
