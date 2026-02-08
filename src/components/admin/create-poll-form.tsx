"use client";

import { useState, useTransition } from "react";
import { Plus, X, Send } from "lucide-react";
import { createPoll } from "@/actions/polls";
import { cn } from "@/lib/utils";

interface CreatePollFormProps {
  onSuccess?: () => void;
}

export function CreatePollForm({ onSuccess }: CreatePollFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isMultiple, setIsMultiple] = useState(false);
  const [activeUntil, setActiveUntil] = useState("");

  const addOption = () => {
    if (options.length < 10) {
      setOptions((prev) => [...prev, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const handleSubmit = () => {
    setError(null);
    setSuccess(false);

    const filledOptions = options.filter((o) => o.trim());
    if (filledOptions.length < 2) {
      setError("Vyplňte alespoň 2 možnosti");
      return;
    }

    const fd = new FormData();
    fd.set("question", question);
    fd.set("description", description);
    fd.set("isAnonymous", String(isAnonymous));
    fd.set("isMultiple", String(isMultiple));
    if (activeUntil) fd.set("activeUntil", activeUntil);
    filledOptions.forEach((opt) => fd.append("options", opt.trim()));

    startTransition(async () => {
      const result = await createPoll(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        // Reset form
        setQuestion("");
        setDescription("");
        setOptions(["", ""]);
        setIsAnonymous(false);
        setIsMultiple(false);
        setActiveUntil("");
        onSuccess?.();
      }
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <h3 className="text-base font-bold text-foreground">Nová anketa</h3>

      {/* Question */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground-secondary">
          Otázka *
        </label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Na co se chcete zeptat?"
          className={cn(
            "w-full rounded-xl border border-border px-3 py-2.5 text-sm bg-card text-foreground",
            "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          )}
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground-secondary">
          Popis (volitelné)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Doplňující informace k anketě..."
          rows={2}
          className={cn(
            "w-full rounded-xl border border-border px-3 py-2.5 text-sm resize-none bg-card text-foreground",
            "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          )}
        />
      </div>

      {/* Options */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground-secondary">
          Možnosti * (min. 2, max. 10)
        </label>
        {options.map((option, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Možnost ${index + 1}`}
              className={cn(
                "flex-1 rounded-xl border border-border px-3 py-2 text-sm bg-card text-foreground",
                "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              )}
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(index)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-foreground-muted hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 active:scale-95 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {options.length < 10 && (
          <button
            type="button"
            onClick={addOption}
            className="flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-medium text-foreground-secondary hover:border-accent hover:text-accent w-full justify-center active:scale-[0.99] transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Přidat možnost
          </button>
        )}
      </div>

      {/* Active until */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground-secondary">
          Platnost do (volitelné)
        </label>
        <input
          type="datetime-local"
          value={activeUntil}
          onChange={(e) => setActiveUntil(e.target.value)}
          className={cn(
            "w-full rounded-xl border border-border px-3 py-2.5 text-sm bg-card text-foreground",
            "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          )}
        />
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
          />
          Anonymní hlasování
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={isMultiple}
            onChange={(e) => setIsMultiple(e.target.checked)}
            className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
          />
          Více možností
        </label>
      </div>

      {/* Error / Success */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg px-3 py-2">
          Anketa byla úspěšně vytvořena!
        </p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isPending || !question.trim() || options.filter((o) => o.trim()).length < 2}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-xl py-3",
          "bg-emerald-600 text-white text-sm font-semibold shadow-sm",
          "hover:bg-emerald-700 active:scale-[0.99] transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <Send className="h-4 w-4" />
        {isPending ? "Vytvářím..." : "Vytvořit anketu"}
      </button>
    </div>
  );
}
