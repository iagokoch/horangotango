"use client";

import Link from "next/link";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VISUAL_STATUS } from "@/features/ferramentas/components/status-badge";
import { META_STATUS } from "@/features/ferramentas/status";
import { STATUS_FERRAMENTA, type Ferramenta, type StatusFerramenta } from "@/features/ferramentas/types";
import { rotaFerramenta } from "@/lib/rotas";
import { cn } from "@/lib/utils";

// Quadro de sombras: nas oficinas, cada ferramenta tem seu contorno pintado no painel, e uma vaga
// vazia mostra na hora o que está fora. Aqui cada vaga é uma ferramenta real do acervo, agrupada
// por categoria, e o estilo da vaga indica o status (com ícone e texto no tooltip e no leitor).
const ESTILO_VAGA: Record<StatusFerramenta, string> = {
  AVAILABLE: "border-border-strong bg-surface text-foreground shadow-raised",
  ON_LOAN: "border-dashed border-status-loan/70 bg-status-loan/[0.06] text-status-loan",
  UNDER_REPAIR: "border-status-repair/60 bg-status-repair/[0.08] text-status-repair",
  LOST: "border-dashed border-status-lost/70 bg-transparent text-status-lost",
  INACTIVE: "hatch border-border bg-transparent text-status-inactive",
};

export function ShadowBoard({ ferramentas }: { ferramentas: Ferramenta[] }) {
  const grupos = new Map<string, Ferramenta[]>();
  for (const ferramenta of ferramentas) {
    const lista = grupos.get(ferramenta.categoria) ?? [];
    lista.push(ferramenta);
    grupos.set(ferramenta.categoria, lista);
  }
  const categorias = Array.from(grupos.keys()).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <div className="space-y-4">
      <div className="pegboard space-y-4 rounded-lg border p-3 sm:p-4">
        {categorias.map((categoria) => (
          <div key={categoria}>
            <p className="eyebrow mb-1.5 flex items-center gap-2">
              <span className="truncate">{categoria}</span>
              <span className="h-px flex-1 bg-border" aria-hidden />
              <span className="tabular">{grupos.get(categoria)!.length}</span>
            </p>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-1.5" aria-label={`Ferramentas de ${categoria}`}>
              {grupos.get(categoria)!.map((ferramenta) => (
                <Vaga key={ferramenta.id} ferramenta={ferramenta} />
              ))}
            </ul>
          </div>
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground" aria-label="Legenda do quadro">
        {STATUS_FERRAMENTA.map((status) => {
          const Icone = VISUAL_STATUS[status].icone;
          return (
            <li key={status} className="flex items-center gap-1.5">
              <span className={cn("flex size-4 items-center justify-center rounded border", ESTILO_VAGA[status])} aria-hidden>
                <Icone className="size-2.5" />
              </span>
              {META_STATUS[status].rotulo}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Vaga({ ferramenta }: { ferramenta: Ferramenta }) {
  const Icone = VISUAL_STATUS[ferramenta.status].icone;
  return (
    <li>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={rotaFerramenta(ferramenta.id)}
            className={cn(
              "group flex h-14 flex-col items-center justify-center gap-1 rounded-md border px-1 transition-[transform,border-color] hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              ESTILO_VAGA[ferramenta.status],
            )}
          >
            <Icone className="size-3.5 opacity-80" aria-hidden />
            <span className="w-full truncate text-center font-mono text-[0.625rem] font-medium leading-none">{ferramenta.codigo}</span>
            <span className="sr-only">
              {ferramenta.nome}, {META_STATUS[ferramenta.status].rotulo}
            </span>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <span className="block font-mono text-2xs opacity-70">{ferramenta.codigo}</span>
          <span className="block font-medium">{ferramenta.nome}</span>
          <span className="block opacity-70">{META_STATUS[ferramenta.status].rotulo}</span>
        </TooltipContent>
      </Tooltip>
    </li>
  );
}
