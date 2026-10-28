"use client";

import Link from "next/link";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VISUAL_STATUS } from "@/features/ferramentas/components/status-badge";
import { META_STATUS } from "@/features/ferramentas/status";
import { STATUS_FERRAMENTA, type Ferramenta, type StatusFerramenta } from "@/features/ferramentas/types";
import { rotaFerramenta } from "@/lib/rotas";
import { cn } from "@/lib/utils";

// Quadro de ferramentas: nas oficinas, cada ferramenta tem sua vaga no quadro, e uma vaga vazia
// mostra na hora o que está fora. Aqui cada vaga é uma ferramenta real do acervo, agrupada por
// categoria. Ferramenta no lugar é uma etiqueta sólida; fora da oficina, só resta o contorno
// tracejado da vaga. Status também vai no tooltip e no texto para leitores de tela.
const ESTILO_VAGA: Record<StatusFerramenta, string> = {
  AVAILABLE: "border-border-strong bg-surface text-foreground shadow-raised hover:border-foreground/50",
  ON_LOAN: "border-dashed border-status-loan/60 bg-transparent text-status-loan hover:bg-status-loan/[0.06]",
  UNDER_REPAIR: "border-status-repair/50 bg-status-repair/[0.07] text-status-repair hover:bg-status-repair/[0.12]",
  LOST: "border-dashed border-status-lost/60 bg-transparent text-status-lost hover:bg-status-lost/[0.06]",
  INACTIVE: "hatch border-border bg-transparent text-status-inactive hover:border-border-strong",
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
    <div className="space-y-5">
      <div className="divide-y rounded-lg border bg-surface-sunken">
        {categorias.map((categoria) => {
          const itens = grupos.get(categoria)!;
          return (
            <div key={categoria} className="grid gap-2.5 p-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5">
              <p className="flex items-baseline justify-between gap-2 text-base font-semibold sm:block sm:pt-1.5">
                <span className="block truncate">{categoria}</span>
                <span className="tabular text-sm font-normal text-muted-foreground">
                  {itens.length} {itens.length === 1 ? "vaga" : "vagas"}
                </span>
              </p>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))] gap-2" aria-label={`Ferramentas de ${categoria}`}>
                {itens.map((ferramenta) => (
                  <Vaga key={ferramenta.id} ferramenta={ferramenta} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground" aria-label="Legenda do quadro">
        {STATUS_FERRAMENTA.map((status) => {
          const Icone = VISUAL_STATUS[status].icone;
          return (
            <li key={status} className="flex items-center gap-2">
              <span className={cn("flex h-4 w-6 items-center justify-center rounded-[3px] border", ESTILO_VAGA[status])} aria-hidden>
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
              "group flex h-12 items-center gap-1.5 rounded-sm border px-2 transition-[transform,border-color,background-color] duration-150 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              ESTILO_VAGA[ferramenta.status],
            )}
          >
            <Icone className="size-3.5 shrink-0 opacity-80" aria-hidden />
            <span className="font-condensed min-w-0 truncate text-sm font-semibold uppercase tracking-wide">{ferramenta.codigo}</span>
            <span className="sr-only">
              {ferramenta.nome}, {META_STATUS[ferramenta.status].rotulo}
            </span>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <span className="block font-semibold">{ferramenta.nome}</span>
          <span className="block opacity-75">
            {ferramenta.codigo} · {META_STATUS[ferramenta.status].rotulo}
          </span>
        </TooltipContent>
      </Tooltip>
    </li>
  );
}
