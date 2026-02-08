"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "next-themes";

export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="top-center"
      toastOptions={{
        duration: 3500,
        classNames: {
          toast:
            "!bg-card !border-border !text-foreground !shadow-lg !rounded-xl",
          title: "!font-semibold !text-sm",
          description: "!text-foreground-secondary !text-xs",
          actionButton: "!bg-accent !text-white !rounded-lg",
          cancelButton: "!bg-background-secondary !text-foreground-secondary !rounded-lg",
          success: "!border-success/30",
          error: "!border-danger/30",
          warning: "!border-warning/30",
        },
      }}
      expand={false}
      richColors
      closeButton
    />
  );
}
