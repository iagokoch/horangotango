import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const calloutVariants = cva("flex gap-3 rounded-lg border p-4 text-base", {
  variants: {
    tone: {
      info: "border-border bg-surface-sunken",
      warning: "border-status-repair/30 bg-status-repair/[0.06]",
      danger: "border-status-overdue/35 bg-status-overdue/[0.06]",
      success: "border-status-available/30 bg-status-available/[0.06]",
    },
  },
  defaultVariants: { tone: "info" },
});

const ICONES = {
  info: { icone: Info, cor: "text-muted-foreground" },
  warning: { icone: AlertTriangle, cor: "text-status-repair" },
  danger: { icone: OctagonAlert, cor: "text-status-overdue" },
  success: { icone: CheckCircle2, cor: "text-status-available" },
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
  const { icone: Icone, cor } = ICONES[tone ?? "info"];
  return (
    <div className={cn(calloutVariants({ tone }), className)} role={role}>
      <Icone className={cn("mt-0.5 size-[18px] shrink-0", cor)} aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold leading-6 text-foreground">{title}</p>}
        {children && <div className="leading-relaxed text-muted-foreground [&_strong]:text-foreground">{children}</div>}
        {action && <div className="flex flex-wrap gap-2 pt-2">{action}</div>}
      </div>
    </div>
  );
}
