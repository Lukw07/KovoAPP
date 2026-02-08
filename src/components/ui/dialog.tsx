"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ============================================================================
// Reusable Dialog / Modal component — replaces native confirm()
// Supports: confirm, alert, and custom content
// ============================================================================

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Custom content inside the dialog */
  children?: React.ReactNode;
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Confirm button variant */
  confirmVariant?: "primary" | "danger";
  /** Called when confirm is clicked */
  onConfirm?: () => void | Promise<void>;
  /** Loading state for confirm button */
  loading?: boolean;
  /** Hide cancel button (for alert dialogs) */
  hideCancel?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  confirmLabel = "Potvrdit",
  cancelLabel = "Zrušit",
  confirmVariant = "primary",
  onConfirm,
  loading = false,
  hideCancel = false,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus trap
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    },
    [onClose, loading],
  );

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";

      // Focus first focusable element in dialog
      requestAnimationFrame(() => {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        focusable?.[0]?.focus();
      });
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      // Restore focus
      previousFocusRef.current?.focus();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={loading ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          ref={dialogRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          aria-describedby={description ? "dialog-desc" : undefined}
          className={cn(
            "w-full max-w-sm rounded-2xl p-6",
            "bg-card border border-border",
            "shadow-2xl dark:shadow-[0_0_60px_rgba(0,0,0,0.8)]",
          )}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 25,
            mass: 0.8,
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <h2
              id="dialog-title"
              className="text-lg font-bold tracking-tight text-foreground"
            >
              {title}
            </h2>
            {!loading && (
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted hover:bg-background-secondary active:scale-95 btn-press focus-ring"
                aria-label="Zavřít"
              >
                <X className="h-4 w-4" weight="bold" />
              </button>
            )}
          </div>

          {/* Description */}
          {description && (
            <p
              id="dialog-desc"
              className="text-sm text-foreground-secondary mb-4"
            >
              {description}
            </p>
          )}

          {/* Custom content */}
          {children && <div className="mb-4">{children}</div>}

          {/* Actions */}
          <div className="flex gap-3 mt-5">
            {!hideCancel && (
              <Button
                variant="secondary"
                className="flex-1"
                onClick={onClose}
                disabled={loading}
              >
                {cancelLabel}
              </Button>
            )}
            {onConfirm && (
              <Button
                variant={confirmVariant}
                className="flex-1"
                onClick={onConfirm}
                loading={loading}
                disabled={loading}
              >
                {confirmLabel}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}

// ============================================================================
// useConfirmDialog — hook to replace native confirm()
// ============================================================================

import { useState } from "react";

interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant: "primary" | "danger";
  resolve: ((value: boolean) => void) | null;
}

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    description: "",
    confirmLabel: "Potvrdit",
    confirmVariant: "primary",
    resolve: null,
  });

  const confirm = (options: {
    title: string;
    description: string;
    confirmLabel?: string;
    confirmVariant?: "primary" | "danger";
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel ?? "Potvrdit",
        confirmVariant: options.confirmVariant ?? "primary",
        resolve,
      });
    });
  };

  const handleClose = () => {
    state.resolve?.(false);
    setState((s) => ({ ...s, open: false, resolve: null }));
  };

  const handleConfirm = () => {
    state.resolve?.(true);
    setState((s) => ({ ...s, open: false, resolve: null }));
  };

  const ConfirmDialog = () => (
    <Dialog
      open={state.open}
      onClose={handleClose}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      confirmVariant={state.confirmVariant}
      onConfirm={handleConfirm}
    />
  );

  return { confirm, ConfirmDialog };
}
