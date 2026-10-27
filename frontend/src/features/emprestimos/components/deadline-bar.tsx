"use client";

import { formatarDataCurta, formatarDistancia } from "@/lib/format";
import { cn } from "@/lib/utils";

import { progressoDoPrazo, situacaoDoEmprestimo } from "../situacao";
import type { Emprestimo } from "../types";
import { useAgora } from "./situacao-badge";

type DadosPrazo = Pick<Emprestimo, "status" | "dataHoraRetirada" | "prazoDevolucao" | "dataHoraDevolucao" | "diasPrazo">;

// Régua do prazo: da retirada à data limite, com marca do momento atual (ou da devolução).
// Passado o prazo, a régua fica cheia e vermelha e o texto informa há quanto tempo venceu.
export function DeadlineBar({ emprestimo, compacto = false }: { emprestimo: DadosPrazo; compacto?: boolean }) {
  const agora = useAgora();
  const situacao = situacaoDoEmprestimo(emprestimo, agora ?? undefined);
  const progresso = agora === null && !emprestimo.dataHoraDevolucao ? 0 : progressoDoPrazo(emprestimo, agora ?? undefined);
  const largura = Math.min(progresso, 1) * 100;

  const cor =
    situacao === "ATRASADO"
      ? "bg-status-overdue"
      : situacao === "VENCE_EM_BREVE"
        ? "bg-status-repair"
        : situacao === "DEVOLVIDO"
          ? "bg-status-available"
          : "bg-status-loan";

  let legenda: string;
  if (situacao === "DEVOLVIDO") {
    legenda = emprestimo.dataHoraDevolucao ? `Devolvida em ${formatarDataCurta(emprestimo.dataHoraDevolucao)}` : "Devolvida";
  } else if (agora === null) {
    legenda = `Prazo até ${formatarDataCurta(emprestimo.prazoDevolucao)}`;
  } else if (situacao === "ATRASADO") {
    legenda = `Venceu ${formatarDistancia(emprestimo.prazoDevolucao, agora)}`;
  } else {
    legenda = `Vence ${formatarDistancia(emprestimo.prazoDevolucao, agora)}`;
  }

  const medidor = (
    <div
      className={cn("relative overflow-hidden rounded-full bg-muted", compacto ? "h-1.5" : "h-2.5")}
      role="meter"
      aria-label="Prazo consumido"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.min(progresso, 1) * 100)}
      aria-valuetext={legenda}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out", cor)} style={{ width: `${largura}%` }} />
    </div>
  );

  const textoLegenda = (
    <p className={cn("text-sm", situacao === "ATRASADO" ? "font-semibold text-status-overdue" : "text-muted-foreground")}>{legenda}</p>
  );

  if (compacto) {
    return (
      <div className="w-full space-y-1.5">
        {medidor}
        {textoLegenda}
      </div>
    );
  }

  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-baseline justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Retirada <span className="font-medium text-foreground">{formatarDataCurta(emprestimo.dataHoraRetirada)}</span>
        </span>
        <span className="tabular">
          {emprestimo.diasPrazo} {emprestimo.diasPrazo === 1 ? "dia" : "dias"}
        </span>
        <span>
          Prazo <span className="font-medium text-foreground">{formatarDataCurta(emprestimo.prazoDevolucao)}</span>
        </span>
      </div>
      {medidor}
      {textoLegenda}
    </div>
  );
}
