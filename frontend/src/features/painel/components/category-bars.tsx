import Link from "next/link";

import { VISUAL_STATUS } from "@/features/ferramentas/components/status-badge";
import { META_STATUS, type ResumoCategoria } from "@/features/ferramentas/status";
import { STATUS_FERRAMENTA } from "@/features/ferramentas/types";
import { ROTAS } from "@/lib/rotas";

// Disponibilidade por categoria: barra empilhada por status. Cada linha leva ao catálogo filtrado.
export function CategoryBars({ resumo }: { resumo: ResumoCategoria[] }) {
  return (
    <ul className="space-y-3">
      {resumo.map(({ categoria, total, porStatus }) => (
        <li key={categoria}>
          <Link
            href={`${ROTAS.ferramentas}?categoria=${encodeURIComponent(categoria)}`}
            className="group block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-medium group-hover:text-brand-ink">{categoria}</span>
              <span className="shrink-0 font-mono text-xs tabular text-muted-foreground">
                {porStatus.AVAILABLE}/{total} disponíveis
              </span>
            </div>
            <div
              className="flex h-2 gap-px overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={STATUS_FERRAMENTA.filter((s) => porStatus[s] > 0)
                .map((s) => `${porStatus[s]} ${META_STATUS[s].rotulo.toLowerCase()}`)
                .join(", ")}
            >
              {STATUS_FERRAMENTA.map((status) =>
                porStatus[status] > 0 ? (
                  <span
                    key={status}
                    className={VISUAL_STATUS[status].cor}
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
