import { CircleCheck, TriangleAlert } from "lucide-react";

import { MonoId } from "@/components/shared/mono-id";
import { formatarDataHora } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ROTULO_ESTADO_FUNCIONAL, type Checklist, type DadosChecklist } from "../types";

interface ChecklistViewProps {
  titulo: string;
  checklist: (DadosChecklist & Partial<Pick<Checklist, "dataHoraRegistro" | "idUsuarioRegistro">>) | null | undefined;
  vazio?: string;
  destaque?: Set<keyof DadosChecklist>;
  usuarioAtualId?: string;
  className?: string;
}

// Registro imutável do checklist, como uma ficha de conferência. "destaque" marca os campos que
// divergem do outro checklist na comparação.
export function ChecklistView({ titulo, checklist, vazio, destaque, usuarioAtualId, className }: ChecklistViewProps) {
  return (
    <section className={cn("rounded-lg border bg-surface", className)} aria-label={titulo}>
      <header className="flex items-center justify-between gap-2 border-b border-dashed px-4 py-2.5">
        <h3 className="eyebrow text-foreground">{titulo}</h3>
        {checklist?.dataHoraRegistro && (
          <time dateTime={checklist.dataHoraRegistro} className="font-mono text-2xs text-muted-foreground">
            {formatarDataHora(checklist.dataHoraRegistro)}
          </time>
        )}
      </header>
      {checklist ? (
        <dl className="space-y-3 px-4 py-3 text-sm">
          <Linha rotulo="Estado funcional" destacado={destaque?.has("estadoFuncional")}>
            <span className="inline-flex items-center gap-1.5 font-medium">
              {checklist.estadoFuncional === "INTACT" ? (
                <CircleCheck className="size-4 text-status-available" aria-hidden />
              ) : (
                <TriangleAlert className="size-4 text-status-repair" aria-hidden />
              )}
              {ROTULO_ESTADO_FUNCIONAL[checklist.estadoFuncional]}
            </span>
          </Linha>
          <Linha rotulo="Avarias visíveis" destacado={destaque?.has("avariasVisiveis")}>
            <span className="whitespace-pre-line">{checklist.avariasVisiveis}</span>
          </Linha>
          <Linha rotulo="Acessórios" destacado={destaque?.has("acessoriosInclusos")}>
            <ul className="flex flex-wrap gap-1.5">
              {checklist.acessoriosInclusos.map((item) => (
                <li key={item} className="rounded border bg-surface-sunken px-1.5 py-0.5 text-xs">
                  {item}
                </li>
              ))}
            </ul>
          </Linha>
          {checklist.idUsuarioRegistro && (
            <Linha rotulo="Registrado por">
              <MonoId id={checklist.idUsuarioRegistro} voce={checklist.idUsuarioRegistro === usuarioAtualId} />
            </Linha>
          )}
        </dl>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">{vazio ?? "Sem registro."}</p>
      )}
    </section>
  );
}

function Linha({ rotulo, destacado, children }: { rotulo: string; destacado?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("-mx-2 rounded-md px-2 py-1", destacado && "bg-status-repair/[0.08] ring-1 ring-inset ring-status-repair/40")}>
      <dt className="mb-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        {rotulo}
        {destacado && <span className="font-semibold text-status-repair">· mudou</span>}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
