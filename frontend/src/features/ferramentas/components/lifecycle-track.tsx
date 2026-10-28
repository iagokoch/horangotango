import { ArrowDownUp } from "lucide-react";

import { cn } from "@/lib/utils";

import { META_STATUS } from "../status";
import type { StatusFerramenta } from "../types";
import { VISUAL_STATUS } from "./status-badge";

// Ciclo de vida da ferramenta (README, diagrama de estados): circulação normal em cima, com a
// troca automática feita pelo balcão, e estados fora de circulação embaixo. O estado atual leva
// o marcador amarelo de "selecionado"; a cor de cada estado fica no ícone.
const FORA: StatusFerramenta[] = ["UNDER_REPAIR", "LOST", "INACTIVE"];

export function LifecycleTrack({ atual }: { atual: StatusFerramenta }) {
  return (
    <div className="space-y-5" aria-label={`Ciclo de vida: status atual ${META_STATUS[atual].rotulo}`}>
      <Grupo titulo="Em circulação">
        <Estado estado="AVAILABLE" atual={atual} />
        <li aria-hidden className="flex items-center gap-2 py-1 pl-[1.1875rem] text-sm text-subtle">
          <span className="mr-2 h-5 w-px bg-border-strong" />
          <ArrowDownUp className="size-3.5" />
          retirada e devolução no balcão
        </li>
        <Estado estado="ON_LOAN" atual={atual} />
      </Grupo>
      <Grupo titulo="Fora de circulação">
        {FORA.map((estado) => (
          <Estado key={estado} estado={estado} atual={atual} />
        ))}
      </Grupo>
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">{titulo}</p>
      <ol className="space-y-1">{children}</ol>
    </div>
  );
}

function Estado({ estado, atual }: { estado: StatusFerramenta; atual: StatusFerramenta }) {
  const ativo = estado === atual;
  const { icone: Icone, texto } = VISUAL_STATUS[estado];
  return (
    <li
      aria-current={ativo ? "step" : undefined}
      title={META_STATUS[estado].descricao}
      className={cn(
        "relative flex min-h-10 items-center gap-3 rounded-md border px-3 py-2 text-base transition-colors",
        ativo ? "border-brand bg-brand-soft font-semibold text-foreground" : "border-transparent text-muted-foreground",
      )}
    >
      <Icone className={cn("size-4 shrink-0", ativo ? texto : "text-subtle")} aria-hidden />
      <span className="flex-1">{META_STATUS[estado].rotulo}</span>
      {ativo && <span className="rounded-sm bg-brand px-1.5 py-px text-xs font-semibold text-brand-foreground">atual</span>}
    </li>
  );
}
