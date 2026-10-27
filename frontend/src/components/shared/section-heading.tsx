import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// Título de seção solta na folha (fora de painel): mesma escala do título de painel, com ações
// alinhadas pela linha de base.
export function SectionHeading({
  id,
  title,
  description,
  actions,
  className,
}: {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-lg font-semibold leading-6">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  );
}
