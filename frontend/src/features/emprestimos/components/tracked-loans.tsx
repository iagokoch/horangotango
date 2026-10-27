"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowRight, Inbox, RotateCw, X } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorPanel } from "@/components/shared/error-panel";
import { MonoId } from "@/components/shared/mono-id";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Papel } from "@/lib/auth/types";
import { formatarDataCurta } from "@/lib/format";
import { rotaDevolucao, rotaEmprestimo } from "@/lib/rotas";
import { cn } from "@/lib/utils";

import type { ItemAcompanhado } from "../actions";
import { deixarDeAcompanhar } from "../acompanhamento";
import { useAcompanhados } from "../hooks/use-acompanhados";
import { situacaoDoEmprestimo, type Situacao } from "../situacao";
import { DeadlineBar } from "./deadline-bar";
import { SituacaoBadge, useAgora } from "./situacao-badge";

type Filtro = "ABERTOS" | "ATRASADOS" | "ENCERRADOS" | "TODOS";

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: "ABERTOS", rotulo: "Em aberto" },
  { valor: "ATRASADOS", rotulo: "Em atraso" },
  { valor: "ENCERRADOS", rotulo: "Encerrados" },
  { valor: "TODOS", rotulo: "Todos" },
];

const PESO: Record<Situacao, number> = { ATRASADO: 0, VENCE_EM_BREVE: 1, EM_DIA: 2, PERDA: 3, DEVOLVIDO: 4 };

function aplicaFiltro(filtro: Filtro, situacao: Situacao | null): boolean {
  if (filtro === "TODOS") return true;
  if (situacao === null) return filtro === "ENCERRADOS";
  if (filtro === "ATRASADOS") return situacao === "ATRASADO";
  if (filtro === "ABERTOS") return situacao === "ATRASADO" || situacao === "VENCE_EM_BREVE" || situacao === "EM_DIA";
  return situacao === "DEVOLVIDO" || situacao === "PERDA";
}

interface TrackedLoansProps {
  usuarioId: string;
  papel: Papel;
  compacto?: boolean;
  limite?: number;
}

export function TrackedLoans({ usuarioId, papel, compacto = false, limite }: TrackedLoansProps) {
  const { carregando, itens, erro, atualizar } = useAcompanhados(usuarioId);
  const agora = useAgora();
  const [filtro, setFiltro] = useState<Filtro>("ABERTOS");
  const staff = papel === "STAFF";

  const ordenados = useMemo(() => {
    const comSituacao = itens.map((item) => ({
      item,
      situacao: item.emprestimo ? situacaoDoEmprestimo(item.emprestimo, agora ?? undefined) : null,
    }));
    return comSituacao.sort((a, b) => {
      const pa = a.situacao === null ? 9 : PESO[a.situacao];
      const pb = b.situacao === null ? 9 : PESO[b.situacao];
      if (pa !== pb) return pa - pb;
      const prazoA = a.item.emprestimo ? Date.parse(a.item.emprestimo.prazoDevolucao) : 0;
      const prazoB = b.item.emprestimo ? Date.parse(b.item.emprestimo.prazoDevolucao) : 0;
      return prazoA - prazoB;
    });
  }, [itens, agora]);

  const contagem = useMemo(() => {
    const total: Record<Filtro, number> = { ABERTOS: 0, ATRASADOS: 0, ENCERRADOS: 0, TODOS: 0 };
    for (const { situacao } of ordenados) {
      for (const { valor } of FILTROS) if (aplicaFiltro(valor, situacao)) total[valor] += 1;
    }
    return total;
  }, [ordenados]);

  const visiveis = (compacto ? ordenados.filter(({ situacao }) => aplicaFiltro("ABERTOS", situacao)) : ordenados.filter(({ situacao }) => aplicaFiltro(filtro, situacao))).slice(
    0,
    limite,
  );

  if (carregando && itens.length === 0) {
    return (
      <div className="space-y-2" role="status" aria-label="Carregando empréstimos">
        {Array.from({ length: compacto ? 3 : 4 }, (_, indice) => (
          <Skeleton key={indice} className="h-14" />
        ))}
      </div>
    );
  }

  if (erro) {
    return (
      <ErrorPanel
        erro={erro}
        titulo="Não foi possível consultar os empréstimos"
        acao={
          <Button variant="secondary" size="sm" onClick={() => void atualizar()}>
            <RotateCw aria-hidden />
            Tentar novamente
          </Button>
        }
      />
    );
  }

  if (itens.length === 0) {
    return (
      <EmptyState
        icon={<Inbox />}
        title="Nenhum empréstimo acompanhado neste dispositivo"
        description={
          staff
            ? "As retiradas registradas aqui e os empréstimos abertos pelo código aparecem nesta lista."
            : "Abra um empréstimo com o código do comprovante entregue no balcão. Ele passa a aparecer aqui."
        }
        className={compacto ? "py-8" : undefined}
      />
    );
  }

  return (
    <div className="space-y-3">
      {!compacto && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar empréstimos">
            {FILTROS.map(({ valor, rotulo }) => (
              <button
                key={valor}
                type="button"
                aria-pressed={filtro === valor}
                onClick={() => setFiltro(valor)}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  filtro === valor
                    ? "border-foreground bg-foreground text-background"
                    : "bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
                  valor === "ATRASADOS" && contagem.ATRASADOS > 0 && filtro !== valor && "border-status-overdue/40 text-status-overdue",
                )}
              >
                {rotulo}
                <span className={cn("font-mono text-xs", filtro === valor ? "text-background/70" : "text-subtle")}>{contagem[valor]}</span>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => void atualizar()} loading={carregando}>
            {!carregando && <RotateCw aria-hidden />}
            Atualizar
          </Button>
        </div>
      )}

      {visiveis.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          {compacto ? "Nenhum empréstimo em aberto entre os acompanhados." : "Nenhum empréstimo neste filtro."}
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-lg border bg-surface shadow-raised">
          {visiveis.map(({ item, situacao }) => (
            <LinhaEmprestimo
              key={item.id}
              item={item}
              situacao={situacao}
              staff={staff}
              usuarioId={usuarioId}
              compacto={compacto}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function LinhaEmprestimo({
  item,
  situacao,
  staff,
  usuarioId,
  compacto,
}: {
  item: ItemAcompanhado;
  situacao: Situacao | null;
  staff: boolean;
  usuarioId: string;
  compacto: boolean;
}) {
  const remover = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => deixarDeAcompanhar(usuarioId, item.id)}
          aria-label="Deixar de acompanhar neste dispositivo"
        >
          <X aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Deixar de acompanhar</TooltipContent>
    </Tooltip>
  );

  if (!item.emprestimo) {
    return (
      <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
          <MonoId id={item.id} />
          {item.erro === 404 ? "não encontrado na API" : item.erro === 403 ? "sem permissão para consultar" : "indisponível no momento"}
        </span>
        {remover}
      </li>
    );
  }

  const emprestimo = item.emprestimo;
  const aberto = emprestimo.status === "ACTIVE";
  const acoes = (
    <div className="flex items-center justify-end gap-1">
      {staff && aberto && (
        <Button asChild variant="secondary" size="sm">
          <Link href={rotaDevolucao(emprestimo.id)}>
            <ArrowDownLeft aria-hidden />
            Devolver
          </Link>
        </Button>
      )}
      <Button asChild variant="ghost" size="icon-sm">
        <Link href={rotaEmprestimo(emprestimo.id)} aria-label="Abrir empréstimo">
          <ArrowRight aria-hidden />
        </Link>
      </Button>
      {!compacto && remover}
    </div>
  );

  return (
    <li
      className={cn(
        "relative grid gap-3 px-4 py-3 transition-colors hover:bg-surface-sunken/60",
        // Na versão compacta (coluna estreita do painel), a régua de prazo vai para baixo do título.
        compacto
          ? "grid-cols-[minmax(0,1fr)_auto] items-start"
          : "sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center",
        situacao === "ATRASADO" && "bg-status-overdue/[0.04]",
      )}
    >
      {situacao === "ATRASADO" && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-status-overdue" />}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={rotaEmprestimo(emprestimo.id)} className="truncate font-medium hover:text-brand-ink">
            {item.ferramenta ? item.ferramenta.nome : "Ferramenta"}
          </Link>
          <SituacaoBadge emprestimo={emprestimo} />
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {item.ferramenta && <span className="font-mono">{item.ferramenta.codigo}</span>}
          <span>retirada {formatarDataCurta(emprestimo.dataHoraRetirada)}</span>
          {staff && (
            <span className="inline-flex items-center gap-1">
              membro <MonoId id={emprestimo.membroId} />
            </span>
          )}
        </p>
      </div>
      {compacto && acoes}
      {(!compacto || aberto) && (
        <div className={compacto ? "col-span-2" : undefined}>
          <DeadlineBar emprestimo={emprestimo} compacto />
        </div>
      )}
      {!compacto && acoes}
    </li>
  );
}
