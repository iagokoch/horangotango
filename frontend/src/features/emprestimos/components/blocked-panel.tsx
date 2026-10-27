import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { MonoId } from "@/components/shared/mono-id";
import { formatarDataHora } from "@/lib/format";
import { rotaEmprestimo, rotaFerramenta } from "@/lib/rotas";

import { interpretarBloqueio } from "../situacao";

interface BlockedPanelProps {
  detalhes: string[];
  mensagem: string;
}

// Resposta 409 do bloqueio por inadimplência (FR-12, regra crítica). A decisão é da API; aqui só
// mostramos o que ela informou: qual empréstimo está atrasado, de qual ferramenta e desde quando.
export function BlockedPanel({ detalhes, mensagem }: BlockedPanelProps) {
  const { pendencias, outras } = interpretarBloqueio(detalhes);

  return (
    <section
      role="alert"
      className="overflow-hidden rounded-lg border border-status-overdue/40 bg-status-overdue/[0.05]"
      aria-labelledby="titulo-bloqueio"
    >
      <div className="flex gap-3 border-b border-status-overdue/25 px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-status-overdue text-background">
          <ShieldAlert className="size-5" aria-hidden />
        </span>
        <div>
          <h3 id="titulo-bloqueio" className="text-base font-semibold">
            Retirada bloqueada: membro com empréstimo em atraso
          </h3>
          <p className="text-sm text-muted-foreground">
            Nenhuma nova retirada é permitida até a devolução de todas as pendências abaixo. O bloqueio é liberado
            automaticamente quando a última for devolvida.
          </p>
        </div>
      </div>
      {pendencias.length > 0 ? (
        <ul className="divide-y divide-status-overdue/15">
          {pendencias.map((pendencia) => (
            <li key={pendencia.emprestimoId} className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <Link href={rotaEmprestimo(pendencia.emprestimoId)} className="font-medium underline-offset-4 hover:underline">
                  Empréstimo <MonoId id={pendencia.emprestimoId} />
                </Link>
                <Link href={rotaFerramenta(pendencia.ferramentaId)} className="text-muted-foreground underline-offset-4 hover:underline">
                  ferramenta <MonoId id={pendencia.ferramentaId} />
                </Link>
              </div>
              <span className="text-xs font-semibold text-status-overdue">
                em atraso desde {formatarDataHora(pendencia.atrasoDesde)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-sm">{mensagem}</p>
      )}
      {outras.length > 0 && (
        <ul className="border-t border-status-overdue/15 px-4 py-2.5 text-sm text-muted-foreground">
          {outras.map((linha) => (
            <li key={linha}>{linha}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
