"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ChevronRight, Inbox, RotateCw, X } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorPanel } from "@/components/shared/error-panel";
import { MonoId } from "@/components/shared/mono-id";
import { ToolTag } from "@/components/shared/tool-tag";
import { Button } from "@/components/ui/button";
import { FilterTabs } from "@/components/ui/segmented";
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
          <Skeleton key={indice} className={compacto ? "h-16" : "h-[4.5rem]"} />
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
        title={compacto ? "Nada acompanhado ainda" : "Nenhum empréstimo acompanhado neste dispositivo"}
        description={
          staff
            ? "As retiradas registradas aqui e os empréstimos abertos pelo código aparecem nesta lista."
            : "Abra um empréstimo com o código do comprovante entregue no balcão. Ele passa a aparecer aqui."
        }
        className={compacto ? "px-2 py-6" : "rounded-xl border"}
      />
    );
  }

  return (
    <div className="space-y-4">
      {!compacto && (
        <div className="flex items-end gap-3">
          <FilterTabs<Filtro>
            className="min-w-0 flex-1"
            rotulo="Filtrar empréstimos"
            valor={filtro}
            onChange={setFiltro}
            opcoes={FILTROS.map(({ valor, rotulo }) => ({
              valor,
              rotulo,
              quantidade: contagem[valor],
              alerta: valor === "ATRASADOS" && contagem.ATRASADOS > 0,
            }))}
          />
          <Button variant="ghost" size="sm" onClick={() => void atualizar()} loading={carregando} className="mb-1.5 shrink-0">
            {!carregando && <RotateCw aria-hidden />}
            <span className="hidden sm:inline">Atualizar</span>
            <span className="sr-only sm:hidden">Atualizar</span>
          </Button>
        </div>
      )}

      {visiveis.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-base text-muted-foreground">
          {compacto ? "Nenhum empréstimo em aberto entre os acompanhados." : "Nenhum empréstimo neste filtro."}
        </p>
      ) : (
        <ul className={cn("divide-y overflow-hidden", compacto ? "-mx-5 border-y" : "rounded-lg border")}>
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
      <li className="flex items-center justify-between gap-3 px-5 py-3 text-base">
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

  return (
    <li
      className={cn(
        "group relative grid gap-x-5 gap-y-3 px-5 py-4 transition-colors hover:bg-surface-sunken",
        compacto ? "grid-cols-[minmax(0,1fr)_auto]" : "sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] sm:items-center",
        situacao === "ATRASADO" && "bg-status-overdue/[0.035]",
      )}
    >
      {situacao === "ATRASADO" && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-status-overdue" />}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {item.ferramenta && <ToolTag codigo={item.ferramenta.codigo} />}
          <Link
            href={rotaEmprestimo(emprestimo.id)}
            className="min-w-0 truncate text-base font-semibold after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
          >
            {item.ferramenta ? item.ferramenta.nome : "Ferramenta"}
          </Link>
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <SituacaoBadge emprestimo={emprestimo} />
          <span>retirada {formatarDataCurta(emprestimo.dataHoraRetirada)}</span>
          {staff && (
            <span className="inline-flex items-center gap-1">
              membro <MonoId id={emprestimo.membroId} />
            </span>
          )}
        </p>
      </div>
      {(!compacto || aberto) && (
        <div className={compacto ? "col-span-2 row-start-2" : undefined}>
          <DeadlineBar emprestimo={emprestimo} compacto />
        </div>
      )}
      <div className={cn("relative z-10 flex items-center justify-end gap-1", compacto && "col-start-2 row-start-1 self-start")}>
        {staff && aberto && (
          <Button asChild variant="secondary" size="sm">
            <Link href={rotaDevolucao(emprestimo.id)}>
              <ArrowDownLeft aria-hidden />
              Devolver
            </Link>
          </Button>
        )}
        {!compacto && remover}
        {!(staff && aberto) && compacto && <ChevronRight className="size-4 text-subtle" aria-hidden />}
      </div>
    </li>
  );
}
