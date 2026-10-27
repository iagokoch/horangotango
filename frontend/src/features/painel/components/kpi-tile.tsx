import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface KpiTileProps {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  icone?: ReactNode;
  // Fração de 0 a 1 para a régua do indicador.
  fracao?: number;
  corFracao?: string;
  destaque?: "danger";
}

// Indicador em formato de leitura de instrumento: rótulo em mono, número grande tabular e uma
// régua opcional com a proporção. Só recebe números calculados de dados reais da API.
export function KpiTile({ rotulo, valor, detalhe, icone, fracao, corFracao = "bg-foreground", destaque }: KpiTileProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col justify-between gap-3 overflow-hidden rounded-lg border bg-surface p-4 shadow-raised",
        destaque === "danger" && "border-status-overdue/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{rotulo}</p>
        {icone && <span className="text-subtle [&_svg]:size-4">{icone}</span>}
      </div>
      <p className={cn("font-mono text-3xl font-semibold tabular leading-none", destaque === "danger" && "text-status-overdue")}>{valor}</p>
      {fracao !== undefined && (
        <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className={cn("h-full rounded-full", corFracao)} style={{ width: `${Math.round(Math.min(Math.max(fracao, 0), 1) * 100)}%` }} />
        </div>
      )}
      {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  );
}
