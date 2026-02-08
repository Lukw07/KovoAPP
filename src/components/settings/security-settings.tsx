"use client";

import { useState, useTransition } from "react";
import {
  Shield,
  Eye,
  EyeOff,
  Loader2,
  Check,
  Lock,
} from "lucide-react";
import { changePassword } from "@/actions/account";
import { cn } from "@/lib/utils";

export function SecuritySettings() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const toggleVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await changePassword(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        // Reset form
        const form = document.getElementById("password-form") as HTMLFormElement;
        form?.reset();
        setShowPasswords({ current: false, new: false, confirm: false });
        setTimeout(() => setSuccess(false), 4000);
      }
    });
  };

  return (
    <div className="animate-fade-in-up stagger-3 space-y-4 rounded-2xl border border-border bg-card p-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background-secondary">
          <Shield className="h-5 w-5 text-foreground-secondary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Zabezpečení
          </p>
          <p className="text-xs text-foreground-secondary">
            Změna hesla
          </p>
        </div>
      </div>

      {/* Password change form */}
      <form id="password-form" action={handleSubmit} className="space-y-3">
        <PasswordField
          name="currentPassword"
          label="Současné heslo"
          placeholder="Zadejte současné heslo"
          show={showPasswords.current}
          onToggle={() => toggleVisibility("current")}
        />
        <PasswordField
          name="newPassword"
          label="Nové heslo"
          placeholder="Min. 8 znaků, velké písmeno, číslo"
          show={showPasswords.new}
          onToggle={() => toggleVisibility("new")}
        />
        <PasswordField
          name="confirmPassword"
          label="Potvrzení nového hesla"
          placeholder="Zopakujte nové heslo"
          show={showPasswords.confirm}
          onToggle={() => toggleVisibility("confirm")}
        />

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            "btn-press w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-300",
            success
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
              : "bg-linear-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 disabled:opacity-60 disabled:cursor-not-allowed",
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Ukládám…
            </>
          ) : success ? (
            <span className="flex items-center gap-2 animate-bounce-in">
              <Check className="h-4 w-4 animate-check-pop" />
              Heslo změněno!
            </span>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Změnit heslo
            </>
          )}
        </button>
      </form>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2 animate-fade-in-up">
          {error}
        </p>
      )}

      {/* Success */}
      {success && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg px-3 py-2 animate-bounce-in">
          Heslo bylo úspěšně změněno.
        </p>
      )}
    </div>
  );
}

/* ----- Helper: Password input field ----- */
function PasswordField({
  name,
  label,
  placeholder,
  show,
  onToggle,
}: {
  name: string;
  label: string;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        className="text-xs font-medium text-foreground-secondary"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          required
          autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground-secondary transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
