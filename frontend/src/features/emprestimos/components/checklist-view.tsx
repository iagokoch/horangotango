import { CircleCheck, Equal, TriangleAlert } from "lucide-react";

import { MonoId } from "@/components/shared/mono-id";
import { formatarDataHora } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ROTULO_ESTADO_FUNCIONAL, type Checklist, type DadosChecklist, type EstadoFuncional } from "../types";

type ChecklistExibido = (DadosChecklist & Partial<Pick<Checklist, "dataHoraRegistro" | "idUsuarioRegistro">>) | null | undefined;

interface ChecklistViewProps {
  titulo: string;
  checklist: ChecklistExibido;
  vazio?: string;
  destaque?: Set<keyof DadosChecklist>;
  usuarioAtualId?: string;
  className?: string;
}

export function EstadoFuncionalValor({ estado }: { estado: EstadoFuncional }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold">
      {estado === "INTACT" ? (
        <CircleCheck className="size-4 text-status-available" aria-hidden />
      ) : (
        <TriangleAlert className="size-4 text-status-repair" aria-hidden />
      )}
      {ROTULO_ESTADO_FUNCIONAL[estado]}
    </span>
  );
}

function Acessorios({ itens }: { itens: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {itens.map((item) => (
        <li key={item} className="rounded-sm border bg-surface-sunken px-2 py-0.5 text-sm">
          {item}
        </li>
      ))}
    </ul>
  );
}

// Registro imutável do checklist, como uma ficha de conferência. "destaque" marca os campos que
// divergem do outro checklist na comparação.
export function ChecklistView({ titulo, checklist, vazio, destaque, usuarioAtualId, className }: ChecklistViewProps) {
  return (
    <section className={cn("rounded-lg border bg-surface", className)} aria-label={titulo}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-dashed px-4 py-3">
        <h3 className="text-base font-semibold">{titulo}</h3>
        {checklist?.dataHoraRegistro && (
          <time dateTime={checklist.dataHoraRegistro} className="text-sm text-muted-foreground">
            {formatarDataHora(checklist.dataHoraRegistro)}
          </time>
        )}
      </header>
      {checklist ? (
        <dl className="space-y-1 p-2">
          <Linha rotulo="Estado funcional" destacado={destaque?.has("estadoFuncional")}>
            <EstadoFuncionalValor estado={checklist.estadoFuncional} />
          </Linha>
          <Linha rotulo="Avarias visíveis" destacado={destaque?.has("avariasVisiveis")}>
            <span className="whitespace-pre-line">{checklist.avariasVisiveis}</span>
          </Linha>
          <Linha rotulo="Acessórios" destacado={destaque?.has("acessoriosInclusos")}>
            <Acessorios itens={checklist.acessoriosInclusos} />
          </Linha>
          {checklist.idUsuarioRegistro && (
            <Linha rotulo="Registrado por">
              <MonoId id={checklist.idUsuarioRegistro} voce={checklist.idUsuarioRegistro === usuarioAtualId} />
            </Linha>
          )}
        </dl>
      ) : (
        <p className="px-4 py-8 text-center text-base text-muted-foreground">{vazio ?? "Sem registro."}</p>
      )}
    </section>
  );
}

function Linha({ rotulo, destacado, children }: { rotulo: string; destacado?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-md px-2.5 py-2", destacado && "bg-status-repair/[0.08] ring-1 ring-inset ring-status-repair/40")}>
      <dt className="mb-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        {rotulo}
        {destacado && <span className="font-semibold text-status-repair">mudou</span>}
      </dt>
      <dd className="text-base">{children}</dd>
    </div>
  );
}

interface ChecklistComparisonProps {
  retirada: ChecklistExibido;
  devolucao: ChecklistExibido;
  divergentes: Set<keyof DadosChecklist>;
  usuarioAtualId?: string;
  pendente?: string;
}

const CAMPOS: { campo: keyof DadosChecklist; rotulo: string }[] = [
  { campo: "estadoFuncional", rotulo: "Estado funcional" },
  { campo: "avariasVisiveis", rotulo: "Avarias visíveis" },
  { campo: "acessoriosInclusos", rotulo: "Acessórios" },
];

function valorDoCampo(checklist: NonNullable<ChecklistExibido>, campo: keyof DadosChecklist) {
  if (campo === "estadoFuncional") return <EstadoFuncionalValor estado={checklist.estadoFuncional} />;
  if (campo === "avariasVisiveis") return <span className="whitespace-pre-line">{checklist.avariasVisiveis}</span>;
  return <Acessorios itens={checklist.acessoriosInclusos} />;
}

// Comparação campo a campo: cada linha põe a retirada e a devolução lado a lado, com o sinal "="
// ou o aviso "mudou" entre elas. No celular, cada campo vira um bloco com as duas leituras.
export function ChecklistComparison({ retirada, devolucao, divergentes, usuarioAtualId, pendente }: ChecklistComparisonProps) {
  const cabecalho = (checklist: ChecklistExibido, titulo: string, vazio?: string) => (
    <div className="min-w-0">
      <p className="text-base font-semibold">{titulo}</p>
      <p className="text-sm text-muted-foreground">
        {checklist?.dataHoraRegistro ? formatarDataHora(checklist.dataHoraRegistro) : (vazio ?? "Sem registro")}
      </p>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-2 gap-4 border-b bg-surface-sunken px-5 py-3 md:hidden">
        {cabecalho(retirada, "Retirada")}
        {cabecalho(devolucao, "Devolução", pendente)}
      </div>
      <div className="hidden grid-cols-[11rem_minmax(0,1fr)_4.5rem_minmax(0,1fr)] items-end gap-x-4 border-b bg-surface-sunken px-5 py-3 md:grid">
        <span className="text-sm text-muted-foreground">Campo</span>
        {cabecalho(retirada, "Na retirada")}
        <span />
        {cabecalho(devolucao, "Na devolução", pendente)}
      </div>
      <div className="divide-y">
        {CAMPOS.map(({ campo, rotulo }) => {
          const mudou = divergentes.has(campo);
          return (
            <div
              key={campo}
              className={cn(
                "relative grid gap-x-4 gap-y-2 px-5 py-4 md:grid-cols-[11rem_minmax(0,1fr)_4.5rem_minmax(0,1fr)] md:items-start",
                mudou && "bg-status-repair/[0.06]",
              )}
            >
              {mudou && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-status-repair" />}
              <p className="flex items-center gap-2 text-sm font-semibold md:pt-0.5 md:font-normal md:text-muted-foreground">
                {rotulo}
                {mudou && (
                  <span className="rounded-sm bg-status-repair/15 px-1.5 py-px text-xs font-semibold text-status-repair md:hidden">mudou</span>
                )}
              </p>
              <div className="min-w-0 text-base">
                <span className="mb-0.5 block text-sm text-muted-foreground md:sr-only">Na retirada</span>
                {retirada ? valorDoCampo(retirada, campo) : <span className="text-subtle">—</span>}
              </div>
              <div className="hidden justify-center pt-0.5 md:flex">
                {mudou ? (
                  <span className="rounded-sm bg-status-repair/15 px-1.5 py-px text-xs font-semibold text-status-repair">mudou</span>
                ) : devolucao ? (
                  <Equal className="size-4 text-subtle" aria-label="igual" />
                ) : null}
              </div>
              <div className="min-w-0 text-base">
                <span className="mb-0.5 block text-sm text-muted-foreground md:sr-only">Na devolução</span>
                {devolucao ? valorDoCampo(devolucao, campo) : <span className="text-subtle">{pendente ?? "—"}</span>}
              </div>
            </div>
          );
        })}
        <div className="grid gap-x-4 gap-y-2 px-5 py-3 text-sm md:grid-cols-[11rem_minmax(0,1fr)_4.5rem_minmax(0,1fr)]">
          <p className="text-muted-foreground">Registrado por</p>
          <div>
            <span className="mr-2 text-muted-foreground md:sr-only">Na retirada</span>
            <MonoId id={retirada?.idUsuarioRegistro} voce={!!retirada?.idUsuarioRegistro && retirada.idUsuarioRegistro === usuarioAtualId} />
          </div>
          <span className="hidden md:block" />
          <div>
            <span className="mr-2 text-muted-foreground md:sr-only">Na devolução</span>
            <MonoId id={devolucao?.idUsuarioRegistro} voce={!!devolucao?.idUsuarioRegistro && devolucao.idUsuarioRegistro === usuarioAtualId} />
          </div>
        </div>
      </div>
    </div>
  );
}
