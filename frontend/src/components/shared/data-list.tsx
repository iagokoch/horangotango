import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// Lista de dados em linhas (rótulo à esquerda, valor à direita), como uma ficha técnica. No
// celular o rótulo sobe para cima do valor.
export function DataList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("divide-y", className)}>{children}</dl>;
}

export function DataRow({ rotulo, children, className }: { rotulo: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[10.5rem_minmax(0,1fr)] sm:gap-6", className)}>
      <dt className="text-sm text-muted-foreground sm:pt-px">{rotulo}</dt>
      <dd className="min-w-0 text-base">{children}</dd>
    </div>
  );
}
