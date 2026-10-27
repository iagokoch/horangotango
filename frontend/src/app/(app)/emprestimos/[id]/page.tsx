import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownLeft, Lock } from "lucide-react";

import { CopyButton } from "@/components/shared/copy-button";
import { DataList, DataRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorPanel } from "@/components/shared/error-panel";
import { MonoId } from "@/components/shared/mono-id";
import { PageHeader } from "@/components/shared/page-header";
import { RetryButton } from "@/components/shared/retry-button";
import { SectionHeading } from "@/components/shared/section-heading";
import { ToolTag } from "@/components/shared/tool-tag";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { buscarEmprestimo } from "@/features/emprestimos/api";
import { ChecklistComparison } from "@/features/emprestimos/components/checklist-view";
import { DeadlineBar } from "@/features/emprestimos/components/deadline-bar";
import { SituacaoBadge } from "@/features/emprestimos/components/situacao-badge";
import { TrackVisit } from "@/features/emprestimos/components/track-visit";
import { compararChecklists } from "@/features/emprestimos/situacao";
import { buscarFerramenta } from "@/features/ferramentas/api";
import { StatusBadge } from "@/features/ferramentas/components/status-badge";
import { carregar } from "@/lib/api/server";
import { exigirUsuario } from "@/lib/auth/session";
import { formatarDataCurta, formatarDataHora } from "@/lib/format";
import { ROTAS, rotaDevolucao, rotaFerramenta } from "@/lib/rotas";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Empréstimo" };

export default async function EmprestimoPage({ params }: { params: { id: string } }) {
  const usuario = exigirUsuario();
  const staff = usuario.papel === "STAFF";
  const resultado = await carregar(() => buscarEmprestimo(params.id));

  if (!resultado.ok) {
    if (resultado.error.status === 404) notFound();
    if (resultado.error.status === 403) {
      return (
        <EmptyState
          className="mt-6 rounded-xl border"
          icon={<Lock />}
          title="Este empréstimo não é seu"
          description="Membros só consultam os próprios empréstimos. Confira o código do comprovante."
          action={
            <Button asChild variant="secondary">
              <Link href={ROTAS.emprestimos}>Voltar aos empréstimos</Link>
            </Button>
          }
        />
      );
    }
    return <ErrorPanel erro={resultado.error} titulo="Não foi possível carregar o empréstimo" acao={<RetryButton />} />;
  }

  const emprestimo = resultado.data;
  // A ficha da ferramenta é complementar: se falhar, o empréstimo continua visível com o ID.
  const ferramenta = await carregar(() => buscarFerramenta(emprestimo.ferramentaId));
  const aberto = emprestimo.status === "ACTIVE";
  const divergencias =
    emprestimo.checklistRetirada && emprestimo.checklistDevolucao
      ? compararChecklists(emprestimo.checklistRetirada, emprestimo.checklistDevolucao)
      : [];
  const camposDivergentes = new Set(divergencias.map((divergencia) => divergencia.campo));
  const proprio = emprestimo.membroId === usuario.id;

  return (
    <>
      <TrackVisit usuarioId={usuario.id} emprestimoId={emprestimo.id} />
      <PageHeader
        eyebrow={
          <>
            {ferramenta.ok && (
              <Link href={rotaFerramenta(ferramenta.data.id)} className="rounded-tag focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ToolTag codigo={ferramenta.data.codigo} grande />
              </Link>
            )}
            <span className="inline-flex items-center gap-1.5">
              Empréstimo <MonoId id={emprestimo.id} />
            </span>
          </>
        }
        title={ferramenta.ok ? ferramenta.data.nome : "Empréstimo de ferramenta"}
        meta={<SituacaoBadge emprestimo={emprestimo} />}
        actions={
          <>
            <CopyButton valor={emprestimo.id} rotulo="Copiar código" />
            {staff && aberto && (
              <Button asChild>
                <Link href={rotaDevolucao(emprestimo.id)}>
                  <ArrowDownLeft aria-hidden />
                  Registrar devolução
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)] lg:gap-8">
        <Panel>
          <PanelHeader title="Prazo" description={aberto ? "Contado em dias corridos a partir da retirada." : "Empréstimo encerrado."} />
          <PanelBody>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <DeadlineBar emprestimo={emprestimo} />
              </div>
              <span className={cn("stamp self-start sm:self-center", aberto ? "text-foreground" : "text-status-available")}>
                <span className="text-xs font-semibold">{aberto ? "Devolver até" : "Devolvida em"}</span>
                <span className="font-display text-2xl font-bold">
                  {formatarDataCurta(aberto || !emprestimo.dataHoraDevolucao ? emprestimo.prazoDevolucao : emprestimo.dataHoraDevolucao)}
                </span>
              </span>
            </div>
            <dl className="mt-6 grid gap-4 border-t pt-5 sm:grid-cols-3">
              <Dado rotulo="Retirada">{formatarDataHora(emprestimo.dataHoraRetirada)}</Dado>
              <Dado rotulo="Devolver até">
                <span className="font-semibold">{formatarDataHora(emprestimo.prazoDevolucao)}</span>
              </Dado>
              <Dado rotulo="Devolução">
                {emprestimo.dataHoraDevolucao ? formatarDataHora(emprestimo.dataHoraDevolucao) : <span className="text-subtle">Pendente</span>}
              </Dado>
            </dl>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Responsáveis" />
          <PanelBody>
            <DataList>
              <DataRow rotulo="Membro" className="sm:grid-cols-[8rem_minmax(0,1fr)]">
                <MonoId id={emprestimo.membroId} voce={proprio} />
              </DataRow>
              <DataRow rotulo="Staff na retirada" className="sm:grid-cols-[8rem_minmax(0,1fr)]">
                <MonoId id={emprestimo.staffRetiradaId} voce={emprestimo.staffRetiradaId === usuario.id} />
              </DataRow>
              <DataRow rotulo="Staff na devolução" className="sm:grid-cols-[8rem_minmax(0,1fr)]">
                <MonoId id={emprestimo.staffDevolucaoId} voce={emprestimo.staffDevolucaoId === usuario.id} />
              </DataRow>
              <DataRow rotulo="Ferramenta" className="sm:grid-cols-[8rem_minmax(0,1fr)]">
                {ferramenta.ok ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <Link href={rotaFerramenta(ferramenta.data.id)} className="font-medium underline-offset-4 hover:underline">
                      Abrir ficha
                    </Link>
                    <StatusBadge status={ferramenta.data.status} />
                  </span>
                ) : (
                  <MonoId id={emprestimo.ferramentaId} />
                )}
              </DataRow>
            </DataList>
          </PanelBody>
        </Panel>
      </div>

      <section className="mt-10" aria-labelledby="titulo-checklists">
        <SectionHeading
          id="titulo-checklists"
          title="Checklists de conservação"
          description="Registros imutáveis feitos no balcão, comparados campo a campo."
          actions={
            divergencias.length > 0 && (
              <span className="rounded-full bg-status-repair/10 px-3 py-1 text-sm font-semibold text-status-repair">
                {divergencias.length} {divergencias.length === 1 ? "diferença" : "diferenças"}
              </span>
            )
          }
        />
        <ChecklistComparison
          retirada={emprestimo.checklistRetirada}
          devolucao={emprestimo.checklistDevolucao}
          divergentes={camposDivergentes}
          usuarioAtualId={usuario.id}
          pendente={aberto ? "Ainda não registrada" : "Sem checklist de devolução"}
        />
      </section>
    </>
  );
}

function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="mt-1 text-base">{children}</dd>
    </div>
  );
}
