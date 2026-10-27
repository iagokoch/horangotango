"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, LayoutGrid, PackagePlus, PackageSearch, Pencil, Rows3, Search, X } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ToolTag } from "@/components/shared/tool-tag";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { FilterTabs, Segmented } from "@/components/ui/segmented";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatarMoeda } from "@/lib/format";
import { ROTAS, rotaEdicaoFerramenta, rotaFerramenta, rotaRetiradaDaFerramenta } from "@/lib/rotas";
import { cn, normalizarBusca } from "@/lib/utils";

import { contarPorStatus, META_STATUS } from "../status";
import { STATUS_FERRAMENTA, statusFerramentaSchema, type Ferramenta, type StatusFerramenta } from "../types";
import { StatusBadge, StatusDot } from "./status-badge";

type Vista = "tabela" | "grade";
type FiltroStatus = StatusFerramenta | "TODAS";

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

  function limparFiltros() {
    setBusca("");
    router.replace(vista === "grade" ? `${pathname}?vista=grade` : pathname, { scroll: false });
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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="group relative flex-1">
          <label htmlFor="busca-catalogo" className="sr-only">
            Buscar por código, nome ou categoria
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-subtle transition-colors group-focus-within:text-foreground"
            aria-hidden
          />
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
            className="h-11 w-full rounded-md border border-input bg-surface pl-11 pr-10 text-lg shadow-[inset_0_1px_1px_0_hsl(var(--shadow)/0.04)] transition-[border-color,box-shadow] placeholder:text-subtle hover:border-border-strong focus-visible:border-foreground/70 focus-visible:shadow-focus focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {busca && (
            <button
              type="button"
              onClick={() => {
                setBusca("");
                atualizar("q", null);
              }}
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Limpar busca"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="filtro-categoria" className="sr-only">
            Categoria
          </label>
          <Select
            id="filtro-categoria"
            value={categoria ?? ""}
            onChange={(evento) => atualizar("categoria", evento.target.value || null)}
            className={cn("h-11 min-w-0 flex-1 lg:w-56 lg:flex-none", categoria && "border-foreground/60 font-medium")}
          >
            <option value="">Todas as categorias</option>
            {categorias.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </Select>
          <Segmented<Vista>
            rotulo="Modo de visualização"
            valor={vista}
            onChange={(valor) => atualizar("vista", valor === "grade" ? "grade" : null)}
            className="h-11"
            opcoes={[
              { valor: "tabela", rotulo: "Visualizar em tabela", icone: <Rows3 aria-hidden />, somenteIcone: true },
              { valor: "grade", rotulo: "Visualizar em grade", icone: <LayoutGrid aria-hidden />, somenteIcone: true },
            ]}
          />
        </div>
      </div>

      <FilterTabs<FiltroStatus>
        rotulo="Filtrar por status"
        valor={status ?? "TODAS"}
        onChange={(valor) => atualizar("status", valor === "TODAS" || valor === status ? null : valor)}
        opcoes={[
          { valor: "TODAS", rotulo: "Todas", quantidade: baseFiltrada.length },
          ...STATUS_FERRAMENTA.map((valor) => ({
            valor,
            rotulo: META_STATUS[valor].rotuloPlural,
            quantidade: contagem[valor],
            marcador: <StatusDot status={valor} />,
          })),
        ]}
      />

      {filtrando && visiveis.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-base text-muted-foreground">
          <p>
            <span className="tabular font-semibold text-foreground">{visiveis.length}</span> de{" "}
            <span className="tabular">{ferramentas.length}</span> {ferramentas.length === 1 ? "ferramenta" : "ferramentas"}
            {categoria && (
              <>
                {" "}
                em <span className="font-medium text-foreground">{categoria}</span>
              </>
            )}
          </p>
          <Button variant="ghost" size="sm" onClick={limparFiltros}>
            <X aria-hidden />
            Limpar filtros
          </Button>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {visiveis.length} ferramentas exibidas
      </p>

      {visiveis.length === 0 ? (
        ferramentas.length === 0 ? (
          <EmptyState
            className="rounded-xl border"
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
            className="rounded-xl border"
            icon={<Search />}
            title="Nenhuma ferramenta encontrada"
            description="Nada no acervo corresponde à busca e aos filtros atuais. Tente outro termo ou limpe os filtros."
            action={
              filtrando && (
                <Button variant="secondary" onClick={limparFiltros}>
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
        <>
          <TabelaFerramentas ferramentas={visiveis} podeGerenciar={podeGerenciar} />
          <ListaFerramentas ferramentas={visiveis} podeGerenciar={podeGerenciar} />
        </>
      )}
    </div>
  );
}

function TabelaFerramentas({ ferramentas, podeGerenciar }: { ferramentas: Ferramenta[]; podeGerenciar: boolean }) {
  return (
    <div className="hidden overflow-hidden rounded-lg border md:block">
      <Table>
        <TableHeader className="bg-surface-sunken">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[8.5rem]">Código</TableHead>
            <TableHead>Ferramenta</TableHead>
            <TableHead className="hidden lg:table-cell">Categoria</TableHead>
            <TableHead className="hidden text-right xl:table-cell">Valor estimado</TableHead>
            <TableHead className="w-[10rem]">Status</TableHead>
            {podeGerenciar && (
              <TableHead className="w-0 text-right">
                <span className="sr-only">Ações</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ferramentas.map((ferramenta) => (
            <TableRow key={ferramenta.id} className="group">
              <TableCell>
                <Link
                  href={rotaFerramenta(ferramenta.id)}
                  className="rounded-tag focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`${ferramenta.codigo}, ${ferramenta.nome}`}
                >
                  <ToolTag codigo={ferramenta.codigo} className="transition-colors group-hover:border-foreground/40" />
                </Link>
              </TableCell>
              <TableCell className="max-w-[22rem]">
                <Link
                  href={rotaFerramenta(ferramenta.id)}
                  className="block truncate font-semibold underline-offset-4 hover:underline"
                  tabIndex={-1}
                >
                  {ferramenta.nome}
                </Link>
                <span className="block truncate text-sm text-muted-foreground lg:hidden">{ferramenta.categoria}</span>
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">{ferramenta.categoria}</TableCell>
              <TableCell className="tabular hidden text-right text-muted-foreground xl:table-cell">
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

// No celular, a tabela vira lista: etiqueta e status na primeira linha, nome em destaque.
function ListaFerramentas({ ferramentas, podeGerenciar }: { ferramentas: Ferramenta[]; podeGerenciar: boolean }) {
  return (
    <ul className="-mx-4 divide-y border-y md:hidden">
      {ferramentas.map((ferramenta) => (
        <li key={ferramenta.id} className="relative flex items-start gap-3 px-4 py-3.5 transition-colors active:bg-surface-sunken">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <ToolTag codigo={ferramenta.codigo} />
              <StatusBadge status={ferramenta.status} />
            </div>
            <Link
              href={rotaFerramenta(ferramenta.id)}
              className="mt-2 block text-lg font-semibold leading-snug after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
            >
              {ferramenta.nome}
            </Link>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {ferramenta.categoria} · <span className="tabular">{formatarMoeda(ferramenta.valorEstimado)}</span>
            </p>
          </div>
          {podeGerenciar && (
            <div className="relative z-10 -mr-1.5">
              <AcoesLinha ferramenta={ferramenta} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function AcoesLinha({ ferramenta }: { ferramenta: Ferramenta }) {
  return (
    <div className="flex justify-end gap-0.5">
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

// Grade em formato de etiqueta pendurada: ilhós no topo, código em destaque, picote antes do valor.
function GradeFerramentas({ ferramentas, podeGerenciar }: { ferramentas: Ferramenta[]; podeGerenciar: boolean }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {ferramentas.map((ferramenta) => (
        <li key={ferramenta.id}>
          <article className="group relative flex h-full flex-col rounded-lg border bg-surface transition-[border-color,box-shadow,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-raised">
            <div className="flex items-start justify-between gap-3 px-4 pt-4">
              <span className="flex items-center gap-2.5">
                <span aria-hidden className="size-3 shrink-0 rounded-full border-2 border-border-strong bg-canvas" />
                <span className="font-condensed text-xl font-bold uppercase leading-none tracking-wide">{ferramenta.codigo}</span>
              </span>
              <StatusBadge status={ferramenta.status} />
            </div>
            <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
              <h3 className="text-lg font-semibold leading-snug">
                <Link
                  href={rotaFerramenta(ferramenta.id)}
                  className="after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                >
                  {ferramenta.nome}
                </Link>
              </h3>
              <p className="text-sm text-muted-foreground">{ferramenta.categoria}</p>
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{ferramenta.estadoConservacao}</p>
            </div>
            <div className="flex min-h-[3.25rem] items-center justify-between gap-2 border-t border-dashed px-4 py-2">
              <span className="tabular text-base font-medium">{formatarMoeda(ferramenta.valorEstimado)}</span>
              {podeGerenciar && (
                <span className="relative z-10 -mr-1.5">
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
