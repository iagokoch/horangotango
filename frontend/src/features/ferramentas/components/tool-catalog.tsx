"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, LayoutGrid, PackagePlus, PackageSearch, Pencil, Rows3, Search, X } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatarMoeda } from "@/lib/format";
import { ROTAS, rotaEdicaoFerramenta, rotaFerramenta, rotaRetiradaDaFerramenta } from "@/lib/rotas";
import { cn, normalizarBusca } from "@/lib/utils";

import { contarPorStatus, META_STATUS } from "../status";
import { STATUS_FERRAMENTA, statusFerramentaSchema, type Ferramenta, type StatusFerramenta } from "../types";
import { StatusBadge, StatusDot } from "./status-badge";

type Vista = "tabela" | "grade";

interface ToolCatalogProps {
  ferramentas: Ferramenta[];
  podeGerenciar: boolean;
}

// Catálogo com filtros no próprio navegador: a API devolve o acervo completo em uma chamada
// (sem paginação), o que permite contar cada status e filtrar sem novas requisições. O estado
// dos filtros fica na URL para o link poder ser compartilhado.
export function ToolCatalog({ ferramentas, podeGerenciar }: ToolCatalogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [busca, setBusca] = useState(params.get("q") ?? "");
  const termo = useDeferredValue(busca);
  const statusParam = statusFerramentaSchema.safeParse(params.get("status"));
  const status: StatusFerramenta | null = statusParam.success ? statusParam.data : null;
  const categoria = params.get("categoria");
  const vista: Vista = params.get("vista") === "grade" ? "grade" : "tabela";

  function atualizar(chave: string, valor: string | null) {
    const proximo = new URLSearchParams(params.toString());
    if (valor) proximo.set(chave, valor);
    else proximo.delete(chave);
    const query = proximo.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const categorias = useMemo(
    () => Array.from(new Set(ferramentas.map((f) => f.categoria))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [ferramentas],
  );

  // A contagem por status respeita busca e categoria, para o número do filtro bater com a lista.
  const baseFiltrada = useMemo(() => {
    const alvo = normalizarBusca(termo);
    return ferramentas.filter((ferramenta) => {
      if (categoria && ferramenta.categoria !== categoria) return false;
      if (!alvo) return true;
      return [ferramenta.codigo, ferramenta.nome, ferramenta.categoria].some((campo) =>
        normalizarBusca(campo).includes(alvo),
      );
    });
  }, [ferramentas, termo, categoria]);

  const contagem = useMemo(() => contarPorStatus(baseFiltrada), [baseFiltrada]);
  const visiveis = status ? baseFiltrada.filter((ferramenta) => ferramenta.status === status) : baseFiltrada;
  const filtrando = Boolean(termo || status || categoria);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <label htmlFor="busca-catalogo" className="sr-only">
            Buscar por código, nome ou categoria
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <input
            id="busca-catalogo"
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            onBlur={() => atualizar("q", busca.trim() || null)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter") atualizar("q", busca.trim() || null);
            }}
            placeholder="Buscar por código, nome ou categoria"
            className="h-10 w-full rounded-lg border bg-surface pl-9 pr-3 text-base shadow-raised placeholder:text-subtle hover:border-border-strong focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="filtro-categoria" className="sr-only">
            Categoria
          </label>
          <select
            id="filtro-categoria"
            value={categoria ?? ""}
            onChange={(evento) => atualizar("categoria", evento.target.value || null)}
            className="h-10 min-w-0 flex-1 rounded-lg border bg-surface px-3 text-sm shadow-raised hover:border-border-strong focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 lg:w-52 lg:flex-none"
          >
            <option value="">Todas as categorias</option>
            {categorias.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </select>
          <div className="flex h-10 rounded-lg border bg-surface p-1 shadow-raised" role="group" aria-label="Modo de visualização">
            {(
              [
                { valor: "tabela", rotulo: "Tabela", icone: Rows3 },
                { valor: "grade", rotulo: "Grade", icone: LayoutGrid },
              ] as const
            ).map(({ valor, rotulo, icone: Icone }) => (
              <Tooltip key={valor}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => atualizar("vista", valor === "grade" ? "grade" : null)}
                    aria-pressed={vista === valor}
                    aria-label={`Visualizar em ${rotulo.toLowerCase()}`}
                    className={cn(
                      "flex w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      vista === valor && "bg-accent text-foreground",
                    )}
                  >
                    <Icone className="size-4" aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{rotulo}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filtrar por status">
        <div className="flex w-max gap-1.5">
          <FiltroStatus ativo={status === null} onClick={() => atualizar("status", null)} rotulo="Todas" quantidade={baseFiltrada.length} />
          {STATUS_FERRAMENTA.map((valor) => (
            <FiltroStatus
              key={valor}
              ativo={status === valor}
              onClick={() => atualizar("status", status === valor ? null : valor)}
              rotulo={META_STATUS[valor].rotuloPlural}
              quantidade={contagem[valor]}
              status={valor}
            />
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {visiveis.length} ferramentas exibidas
      </p>

      {visiveis.length === 0 ? (
        ferramentas.length === 0 ? (
          <EmptyState
            icon={<PackageSearch />}
            title="O acervo ainda está vazio"
            description={
              podeGerenciar
                ? "Cadastre a primeira ferramenta para começar a controlar retiradas e devoluções."
                : "Nenhuma ferramenta foi cadastrada pela equipe da oficina até agora."
            }
            action={
              podeGerenciar && (
                <Button asChild>
                  <Link href={ROTAS.novaFerramenta}>
                    <PackagePlus aria-hidden />
                    Cadastrar ferramenta
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <EmptyState
            icon={<Search />}
            title="Nenhuma ferramenta encontrada"
            description="Nenhum item corresponde aos filtros atuais."
            action={
              filtrando && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setBusca("");
                    router.replace(vista === "grade" ? `${pathname}?vista=grade` : pathname, { scroll: false });
                  }}
                >
                  <X aria-hidden />
                  Limpar filtros
                </Button>
              )
            }
          />
        )
      ) : vista === "grade" ? (
        <GradeFerramentas ferramentas={visiveis} podeGerenciar={podeGerenciar} />
      ) : (
        <TabelaFerramentas ferramentas={visiveis} podeGerenciar={podeGerenciar} />
      )}
    </div>
  );
}

interface FiltroStatusProps {
  ativo: boolean;
  onClick: () => void;
  rotulo: string;
  quantidade: number;
  status?: StatusFerramenta;
}

function FiltroStatus({ ativo, onClick, rotulo, quantidade, status }: FiltroStatusProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        "flex h-8 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        ativo
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
      )}
    >
      {status && <StatusDot status={status} className={ativo ? "ring-2 ring-background/40" : undefined} />}
      {rotulo}
      <span className={cn("font-mono text-xs tabular", ativo ? "text-background/70" : "text-subtle")}>{quantidade}</span>
    </button>
  );
}

function TabelaFerramentas({ ferramentas, podeGerenciar }: { ferramentas: Ferramenta[]; podeGerenciar: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-surface shadow-raised">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[9rem]">Código</TableHead>
            <TableHead>Ferramenta</TableHead>
            <TableHead className="hidden md:table-cell">Categoria</TableHead>
            <TableHead className="hidden text-right lg:table-cell">Valor estimado</TableHead>
            <TableHead>Status</TableHead>
            {podeGerenciar && <TableHead className="w-0 text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ferramentas.map((ferramenta) => (
            <TableRow key={ferramenta.id} className="group">
              <TableCell>
                <Link
                  href={rotaFerramenta(ferramenta.id)}
                  className="font-mono text-xs font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {ferramenta.codigo}
                </Link>
              </TableCell>
              <TableCell className="max-w-[18rem]">
                <Link href={rotaFerramenta(ferramenta.id)} className="block truncate font-medium hover:text-brand-ink" tabIndex={-1}>
                  {ferramenta.nome}
                </Link>
                <span className="block truncate text-xs text-muted-foreground md:hidden">{ferramenta.categoria}</span>
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">{ferramenta.categoria}</TableCell>
              <TableCell className="hidden text-right font-mono text-xs tabular text-muted-foreground lg:table-cell">
                {formatarMoeda(ferramenta.valorEstimado)}
              </TableCell>
              <TableCell>
                <StatusBadge status={ferramenta.status} />
              </TableCell>
              {podeGerenciar && (
                <TableCell className="text-right">
                  <AcoesLinha ferramenta={ferramenta} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AcoesLinha({ ferramenta }: { ferramenta: Ferramenta }) {
  return (
    <div className="flex justify-end gap-1">
      {ferramenta.status === "AVAILABLE" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="ghost" size="icon-sm">
              <Link href={rotaRetiradaDaFerramenta(ferramenta.id)} aria-label={`Registrar retirada de ${ferramenta.codigo}`}>
                <ArrowUpRight aria-hidden />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Registrar retirada</TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild variant="ghost" size="icon-sm">
            <Link href={rotaEdicaoFerramenta(ferramenta.id)} aria-label={`Editar ${ferramenta.codigo}`}>
              <Pencil aria-hidden />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Editar</TooltipContent>
      </Tooltip>
    </div>
  );
}

// Grade em formato de etiqueta de inventário: código em destaque, faixa lateral na cor do status.
function GradeFerramentas({ ferramentas, podeGerenciar }: { ferramentas: Ferramenta[]; podeGerenciar: boolean }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {ferramentas.map((ferramenta) => (
        <li key={ferramenta.id}>
          <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border bg-surface shadow-raised transition-[border-color,transform] hover:-translate-y-px hover:border-border-strong">
            <div className="flex items-center justify-between gap-2 border-b border-dashed px-4 py-2.5">
              <span className="font-mono text-xs font-semibold tracking-wide">{ferramenta.codigo}</span>
              <StatusBadge status={ferramenta.status} />
            </div>
            <div className="flex flex-1 flex-col gap-1 px-4 py-3">
              <h3 className="text-base font-semibold leading-snug">
                <Link
                  href={rotaFerramenta(ferramenta.id)}
                  className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
                >
                  {ferramenta.nome}
                </Link>
              </h3>
              <p className="text-sm text-muted-foreground">{ferramenta.categoria}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{ferramenta.estadoConservacao}</p>
            </div>
            <div className="flex items-center justify-between gap-2 border-t bg-surface-sunken/60 px-4 py-2">
              <span className="font-mono text-xs tabular text-muted-foreground">{formatarMoeda(ferramenta.valorEstimado)}</span>
              {podeGerenciar && (
                <span className="relative z-10">
                  <AcoesLinha ferramenta={ferramenta} />
                </span>
              )}
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
