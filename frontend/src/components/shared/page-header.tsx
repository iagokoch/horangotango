import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  // Contexto curto acima do título (ex.: a etiqueta da ferramenta). Só quando informa algo.
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

// Cabeçalho das telas: título expandido (a voz da marca), descrição curta e ações à direita. No
// celular as ações descem para baixo do texto e ocupam a largura disponível.
export function PageHeader({ eyebrow, title, description, actions, meta, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0 space-y-2">
        {eyebrow && <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">{eyebrow}</div>}
        <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
        {description && <p className="max-w-[62ch] text-lg leading-relaxed text-muted-foreground">{description}</p>}
        {meta && <div className="flex flex-wrap items-center gap-2 pt-1">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
    </header>
  );
}
