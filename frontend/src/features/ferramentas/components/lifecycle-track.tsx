import { cn } from "@/lib/utils";

import { META_STATUS } from "../status";
import type { StatusFerramenta } from "../types";
import { VISUAL_STATUS } from "./status-badge";

// Ciclo de vida da ferramenta (README, diagrama de estados): circulação normal em linha e
// estados fora de circulação abaixo. O estado atual é destacado; a legenda explica cada um.
const CIRCULACAO: StatusFerramenta[] = ["AVAILABLE", "ON_LOAN"];
const FORA: StatusFerramenta[] = ["UNDER_REPAIR", "LOST", "INACTIVE"];

export function LifecycleTrack({ atual }: { atual: StatusFerramenta }) {
  return (
    <div className="space-y-3" aria-label={`Ciclo de vida: status atual ${META_STATUS[atual].rotulo}`}>
      <Linha titulo="Em circulação" estados={CIRCULACAO} atual={atual} conectado />
      <Linha titulo="Fora de circulação" estados={FORA} atual={atual} />
    </div>
  );
}

function Linha({
  titulo,
  estados,
  atual,
  conectado = false,
}: {
  titulo: string;
  estados: StatusFerramenta[];
  atual: StatusFerramenta;
  conectado?: boolean;
}) {
  return (
    <div>
      <p className="eyebrow mb-1.5">{titulo}</p>
      <ol className="flex flex-wrap items-center gap-1.5">
        {estados.map((estado, indice) => {
          const ativo = estado === atual;
          const { icone: Icone } = VISUAL_STATUS[estado];
          return (
            <li key={estado} className="flex items-center gap-1.5">
              {conectado && indice > 0 && <span aria-hidden className="h-px w-4 bg-border-strong" />}
              <span
                aria-current={ativo ? "step" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
                  ativo ? "border-foreground bg-foreground font-semibold text-background" : "border-dashed text-muted-foreground",
                )}
                title={META_STATUS[estado].descricao}
              >
                <Icone className="size-3.5" aria-hidden />
                {META_STATUS[estado].rotulo}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
