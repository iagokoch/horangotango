import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Selo de estado: ponto/ícone na cor do status sobre fundo quase neutro, para que uma lista longa
// não vire um mosaico de cores. O componente que usa a cor sempre inclui ícone e rótulo.
const badgeVariants = cva(
  "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border pl-1.5 pr-2.5 text-sm font-medium leading-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface-sunken text-muted-foreground",
        brand: "border-brand/50 bg-brand-soft text-brand-ink",
        available: "border-status-available/25 bg-status-available/[0.07] text-status-available",
        loan: "border-status-loan/25 bg-status-loan/[0.07] text-status-loan",
        repair: "border-status-repair/30 bg-status-repair/[0.08] text-status-repair",
        lost: "border-status-lost/25 bg-status-lost/[0.07] text-status-lost",
        inactive: "border-border bg-surface-sunken text-status-inactive",
        overdue: "border-status-overdue/40 bg-status-overdue/10 text-status-overdue",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
