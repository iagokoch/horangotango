"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

// Toasts seguem o tema ativo e usam as superfícies do design system.
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group !gap-3 !rounded-lg !border !border-border !bg-popover !px-4 !py-3 !text-base !text-popover-foreground !shadow-overlay !font-sans",
          title: "!font-semibold",
          description: "!text-sm !text-muted-foreground",
          success: "[&_[data-icon]]:!text-status-available",
          error: "[&_[data-icon]]:!text-destructive",
        },
      }}
    />
  );
}
