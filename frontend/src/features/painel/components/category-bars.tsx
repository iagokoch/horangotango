import Link from "next/link";

import { VISUAL_STATUS } from "@/features/ferramentas/components/status-badge";
import { META_STATUS, type ResumoCategoria } from "@/features/ferramentas/status";
import { STATUS_FERRAMENTA } from "@/features/ferramentas/types";
import { ROTAS } from "@/lib/rotas";
import { cn } from "@/lib/utils";

// Disponibilidade por categoria: barra empilhada por status. Cada linha leva ao catálogo filtrado.
export function CategoryBars({ resumo }: { resumo: ResumoCategoria[] }) {
  return (
    <ul className="-mx-2 space-y-0.5">
      {resumo.map(({ categoria, total, porStatus }) => (
        <li key={categoria}>
          <Link
            href={`${ROTAS.ferramentas}?categoria=${encodeURIComponent(categoria)}`}
            className="group block rounded-md px-2 py-2 transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="truncate text-base font-medium">{categoria}</span>
              <span className="tabular shrink-0 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{porStatus.AVAILABLE}</span> de {total} disponíveis
              </span>
            </div>
            <div
              className="flex h-1.5 gap-[2px] overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={STATUS_FERRAMENTA.filter((s) => porStatus[s] > 0)
                .map((s) => `${porStatus[s]} ${META_STATUS[s].rotulo.toLowerCase()}`)
                .join(", ")}
            >
              {STATUS_FERRAMENTA.map((status) =>
                porStatus[status] > 0 ? (
                  <span
                    key={status}
                    className={cn(VISUAL_STATUS[status].cor, status === "INACTIVE" && "bg-status-inactive/40")}
                    style={{ width: `${(porStatus[status] / total) * 100}%` }}
                  />
                ) : null,
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
