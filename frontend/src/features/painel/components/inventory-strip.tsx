import Link from "next/link";

import { StatusDot, VISUAL_STATUS } from "@/features/ferramentas/components/status-badge";
import { META_STATUS } from "@/features/ferramentas/status";
import { STATUS_FERRAMENTA, type StatusFerramenta } from "@/features/ferramentas/types";
import { ROTAS } from "@/lib/rotas";
import { cn } from "@/lib/utils";

const porcento = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });

// Leitura do acervo inteiro numa régua só: cada trecho é a fração de um status e cada número leva
// ao catálogo filtrado. É o único movimento automático do painel (a régua se preenche ao abrir).
export function InventoryStrip({ contagem, total }: { contagem: Record<StatusFerramenta, number>; total: number }) {
  const presentes = STATUS_FERRAMENTA.filter((status) => contagem[status] > 0);

  return (
    <section aria-labelledby="titulo-acervo" className="rounded-xl border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="titulo-acervo" className="text-lg font-semibold">
          Acervo agora
        </h2>
        <Link
          href={ROTAS.ferramentas}
          className="text-base text-muted-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
        >
          <span className="tabular font-semibold text-foreground">{total}</span> {total === 1 ? "ferramenta" : "ferramentas"} no catálogo
        </Link>
      </div>

      <div
        className="mt-5 flex h-3 gap-[3px] overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={presentes.map((status) => `${contagem[status]} ${META_STATUS[status].rotulo.toLowerCase()}`).join(", ")}
      >
        {presentes.map((status, indice) => (
          <span
            key={status}
            className={cn("h-full origin-left animate-segment-grow first:rounded-l-full last:rounded-r-full", VISUAL_STATUS[status].cor, status === "INACTIVE" && "hatch bg-status-inactive/40")}
            style={{ width: `${(contagem[status] / total) * 100}%`, animationDelay: `${indice * 90}ms` }}
          />
        ))}
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-0">
        {STATUS_FERRAMENTA.map((status) => {
          const quantidade = contagem[status];
          return (
            <li key={status} className="min-w-0 lg:border-l lg:pl-5 lg:first:border-l-0 lg:first:pl-0">
              <Link
                href={`${ROTAS.ferramentas}?status=${status}`}
                className="group block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
              >
                <span className="flex items-center gap-2 text-sm text-muted-foreground transition-colors group-hover:text-foreground">
                  <StatusDot status={status} />
                  {META_STATUS[status].rotuloPlural}
                </span>
                <span className="mt-1.5 flex items-baseline gap-2">
                  <span className={cn("font-display tabular text-4xl font-bold", quantidade === 0 && "text-subtle")}>{quantidade}</span>
                  {total > 0 && quantidade > 0 && (
                    <span className="tabular text-sm text-muted-foreground">{porcento.format(quantidade / total)}</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
