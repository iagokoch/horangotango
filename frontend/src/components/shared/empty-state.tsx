import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

// Estado vazio: o ícone fica numa vaga tracejada, como o contorno de uma ferramenta que não está
// no quadro. O texto diz o que fazer a seguir, não só que está vazio.
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="mb-4 flex size-14 items-center justify-center rounded-lg border-2 border-dashed border-border-strong text-subtle [&_svg]:size-6">
        {icon}
      </div>
      <p className="font-display text-xl font-bold">{title}</p>
      {description && <div className="mt-1.5 max-w-[46ch] text-base leading-relaxed text-muted-foreground">{description}</div>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
