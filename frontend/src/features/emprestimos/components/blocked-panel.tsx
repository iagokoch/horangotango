import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";

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
    <section role="alert" className="overflow-hidden rounded-lg border border-status-overdue/40" aria-labelledby="titulo-bloqueio">
      <div className="flex gap-3.5 bg-status-overdue/[0.07] px-5 py-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-status-overdue text-white">
          <ShieldAlert className="size-5" aria-hidden />
        </span>
        <div>
          <h3 id="titulo-bloqueio" className="text-lg font-semibold leading-6">
            Retirada bloqueada: membro com empréstimo em atraso
          </h3>
          <p className="mt-1 text-base leading-relaxed text-muted-foreground">
            Nenhuma nova retirada é permitida até a devolução de todas as pendências abaixo. O bloqueio é liberado
            automaticamente quando a última for devolvida.
          </p>
        </div>
      </div>
      {pendencias.length > 0 ? (
        <ul className="divide-y border-t border-status-overdue/20">
          {pendencias.map((pendencia) => (
            <li key={pendencia.emprestimoId} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
                <Link
                  href={rotaEmprestimo(pendencia.emprestimoId)}
                  className="inline-flex items-center gap-1.5 font-semibold underline-offset-4 hover:underline"
                >
                  Empréstimo <MonoId id={pendencia.emprestimoId} />
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
                <Link
                  href={rotaFerramenta(pendencia.ferramentaId)}
                  className="inline-flex items-center gap-1.5 text-muted-foreground underline-offset-4 hover:underline"
                >
                  ferramenta <MonoId id={pendencia.ferramentaId} />
                </Link>
              </div>
              <span className="text-sm font-semibold text-status-overdue">em atraso desde {formatarDataHora(pendencia.atrasoDesde)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-status-overdue/20 px-5 py-3 text-base">{mensagem}</p>
      )}
      {outras.length > 0 && (
        <ul className="border-t border-status-overdue/20 px-5 py-3 text-base text-muted-foreground">
          {outras.map((linha) => (
            <li key={linha}>{linha}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
