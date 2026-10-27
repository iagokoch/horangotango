import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const calloutVariants = cva("flex gap-3 rounded-lg border px-3.5 py-3 text-sm", {
  variants: {
    tone: {
      info: "border-border bg-surface-sunken text-foreground [&>svg]:text-muted-foreground",
      warning: "border-status-repair/30 bg-status-repair/[0.07] [&>svg]:text-status-repair",
      danger: "border-status-overdue/35 bg-status-overdue/[0.07] [&>svg]:text-status-overdue",
      success: "border-status-available/30 bg-status-available/[0.07] [&>svg]:text-status-available",
    },
  },
  defaultVariants: { tone: "info" },
});

const ICONES = {
  info: Info,
  warning: AlertTriangle,
  danger: OctagonAlert,
  success: CheckCircle2,
} as const;

interface CalloutProps extends VariantProps<typeof calloutVariants> {
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  // "alert" para erros que surgem após uma ação, para leitores de tela anunciarem na hora.
  role?: "alert" | "status";
}

// Alerta em bloco. Ícone diferente por tom, para a mensagem não depender só da cor.
export function Callout({ tone = "info", title, children, action, className, role }: CalloutProps) {
  const Icone = ICONES[tone ?? "info"];
  return (
    <div className={cn(calloutVariants({ tone }), className)} role={role}>
      <Icone className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold leading-5 text-foreground">{title}</p>}
        {children && <div className="text-muted-foreground [&_strong]:text-foreground">{children}</div>}
        {action && <div className="pt-1.5">{action}</div>}
      </div>
    </div>
  );
}
