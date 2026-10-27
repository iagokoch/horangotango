import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Os tons de status usam a cor como texto e um fundo translúcido do mesmo tom, legível nos dois
// temas. O componente que usa a cor deve sempre incluir ícone e rótulo.
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface-sunken text-muted-foreground",
        brand: "border-brand/30 bg-brand-soft text-brand-ink",
        available: "border-status-available/25 bg-status-available/10 text-status-available",
        loan: "border-status-loan/25 bg-status-loan/10 text-status-loan",
        repair: "border-status-repair/30 bg-status-repair/10 text-status-repair",
        lost: "border-status-lost/25 bg-status-lost/10 text-status-lost",
        inactive: "border-status-inactive/25 bg-status-inactive/10 text-status-inactive",
        overdue: "border-status-overdue/30 bg-status-overdue/10 text-status-overdue",
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
