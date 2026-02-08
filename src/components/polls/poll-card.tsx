"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Check,
  Clock,
  Lock,
  Users,
  User,
  Ban,
  RotateCcw,
} from "lucide-react";
import { voteInPoll, removeVoteFromPoll } from "@/actions/polls";
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

  const handleRemoveVote = () => {
    if (!poll.isActive || isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await removeVoteFromPoll(poll.id);
      if (result.error) {
        setError(result.error);
      } else {
        // Optimistic update — remove all user votes
        setLocalOptions((prev) =>
          prev.map((opt) =>
            localUserVotes.includes(opt.index)
              ? { ...opt, count: Math.max(0, opt.count - 1) }
              : opt
          )
        );
        setLocalTotalVotes((prev) => Math.max(0, prev - localUserVotes.length));
        setLocalUserVotes([]);
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
        "rounded-2xl border bg-card shadow-sm overflow-hidden",
        poll.isActive ? "border-border" : "border-border opacity-75"
      )}
    >
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold text-foreground leading-snug">
              {poll.question}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              {poll.isAnonymous && (
                <span
                  className="flex items-center gap-0.5 rounded-full bg-background-secondary px-2 py-0.5 text-[10px] font-medium text-foreground-secondary"
                  title="Anonymní hlasování"
                >
                  <Lock className="h-3 w-3" />
                </span>
              )}
              {!poll.isActive && (
                <span className="flex items-center gap-0.5 rounded-full bg-red-50 dark:bg-red-900/30 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                  <Ban className="h-3 w-3" />
                  Ukončeno
                </span>
              )}
            </div>
          </div>
          {poll.description && (
            <p className="text-sm text-foreground-secondary">{poll.description}</p>
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
                    ? "border-accent/50 bg-accent-light"
                    : poll.isActive && !hasVoted
                      ? "border-border hover:border-accent/40 hover:bg-accent-light/50 cursor-pointer"
                      : "border-border cursor-default"
                )}
              >
                {/* Progress bar background */}
                {showResults && (
                  <motion.div
                    className={cn(
                      "absolute inset-0 rounded-xl",
                      isSelected ? "bg-accent-light" : "bg-background-secondary/50"
                    )}
                    initial={{ width: "0%" }}
                    animate={{ width: `${percentage}%` }}
                    transition={{
                      duration: 0.8,
                      ease: [0.22, 1, 0.36, 1],
                      delay: option.index * 0.1,
                    }}
                  />
                )}

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AnimatePresence>
                      {isSelected && (
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        >
                          <Check className="h-4 w-4 text-blue-600 shrink-0" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <span
                      className={cn(
                        "text-sm",
                        isSelected
                          ? "font-semibold text-accent-text"
                          : "text-foreground"
                      )}
                    >
                      {option.text}
                    </span>
                  </div>

                  {showResults && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-medium text-foreground-secondary">
                        {option.count}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-bold",
                          isSelected ? "text-accent-text" : "text-foreground-secondary"
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
          <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Footer: meta info */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-background-secondary">
              {poll.creator.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={poll.creator.avatarUrl}
                  alt=""
                  className="h-5 w-5 rounded-full"
                />
              ) : (
                <User className="h-3 w-3 text-foreground-muted" />
              )}
            </div>
            <span>{poll.creator.name}</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-foreground-muted">
            {/* Unvote button */}
            {hasVoted && poll.isActive && (
              <button
                onClick={handleRemoveVote}
                disabled={isPending}
                className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="h-3 w-3" />
                Zrušit hlas
              </button>
            )}
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
          <p className="text-[10px] text-foreground-muted text-center">
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
        <h1 className="text-xl font-bold text-foreground">Ankety</h1>
        <div className="flex items-center gap-1 rounded-xl bg-background-secondary p-0.5">
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
                  ? "bg-card text-foreground shadow-sm"
                  : "text-foreground-secondary hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center"
          >
            <BarChart3 className="mb-3 h-12 w-12 text-foreground-muted" />
            <p className="text-sm font-medium text-foreground-secondary">
              {filter === "active"
                ? "Žádné aktivní ankety"
                : filter === "closed"
                  ? "Žádné ukončené ankety"
                  : "Žádné ankety"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={filter}
            className="space-y-4"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={{
              initial: {},
              animate: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
              exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
            }}
          >
            {filtered.map((poll) => (
              <motion.div
                key={poll.id}
                variants={{
                  initial: { opacity: 0, y: 20, scale: 0.98 },
                  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
                  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
                }}
              >
                <PollCard poll={poll} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
