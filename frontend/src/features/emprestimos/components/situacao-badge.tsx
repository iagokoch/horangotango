"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AlarmClock, CheckCheck, Clock, Hourglass, SearchX } from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { ROTULO_SITUACAO, situacaoDoEmprestimo, type Situacao } from "../situacao";
import type { Emprestimo } from "../types";

export const VISUAL_SITUACAO: Record<Situacao, { tone: BadgeTone; icone: LucideIcon }> = {
  EM_DIA: { tone: "loan", icone: Clock },
  VENCE_EM_BREVE: { tone: "repair", icone: Hourglass },
  ATRASADO: { tone: "overdue", icone: AlarmClock },
  DEVOLVIDO: { tone: "available", icone: CheckCheck },
  PERDA: { tone: "lost", icone: SearchX },
};

// O "agora" só é lido após a hidratação: no servidor a situação usa o horário da renderização,
// e o cliente corrige em seguida, evitando divergência entre os dois.
export function useAgora(intervaloMs = 60_000): number | null {
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    setAgora(Date.now());
    const id = window.setInterval(() => setAgora(Date.now()), intervaloMs);
    return () => window.clearInterval(id);
  }, [intervaloMs]);
  return agora;
}

export function SituacaoBadge({
  emprestimo,
  className,
}: {
  emprestimo: Pick<Emprestimo, "status" | "prazoDevolucao">;
  className?: string;
}) {
  const agora = useAgora();
  const situacao = situacaoDoEmprestimo(emprestimo, agora ?? undefined);
  const { tone, icone: Icone } = VISUAL_SITUACAO[situacao];
  return (
    <Badge tone={tone} className={cn(situacao === "ATRASADO" && "animate-pulse-ring", className)}>
      <Icone aria-hidden />
      {ROTULO_SITUACAO[situacao]}
    </Badge>
  );
}
