import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownLeft, Lock } from "lucide-react";

import { CopyButton } from "@/components/shared/copy-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorPanel } from "@/components/shared/error-panel";
import { MonoId } from "@/components/shared/mono-id";
import { PageHeader } from "@/components/shared/page-header";
import { RetryButton } from "@/components/shared/retry-button";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { buscarEmprestimo } from "@/features/emprestimos/api";
import { ChecklistView } from "@/features/emprestimos/components/checklist-view";
import { DeadlineBar } from "@/features/emprestimos/components/deadline-bar";
import { SituacaoBadge } from "@/features/emprestimos/components/situacao-badge";
import { TrackVisit } from "@/features/emprestimos/components/track-visit";
import { compararChecklists } from "@/features/emprestimos/situacao";
import { buscarFerramenta } from "@/features/ferramentas/api";
import { StatusBadge } from "@/features/ferramentas/components/status-badge";
import { carregar } from "@/lib/api/server";
import { exigirUsuario } from "@/lib/auth/session";
import { formatarDataHora } from "@/lib/format";
import { ROTAS, rotaDevolucao, rotaFerramenta } from "@/lib/rotas";

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
          className="mt-8"
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
          <span className="inline-flex items-center gap-1.5">
            Empréstimo <MonoId id={emprestimo.id} className="text-2xs" />
          </span>
        }
        title={ferramenta.ok ? ferramenta.data.nome : "Empréstimo de ferramenta"}
        meta={
          <>
            <SituacaoBadge emprestimo={emprestimo} />
            {ferramenta.ok && (
              <Link href={rotaFerramenta(ferramenta.data.id)} className="font-mono text-xs text-muted-foreground hover:text-foreground">
                {ferramenta.data.codigo}
              </Link>
            )}
          </>
        }
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Prazo" description={aberto ? "Contado em dias corridos a partir da retirada." : "Empréstimo encerrado."} />
          <PanelBody className="space-y-5">
            <DeadlineBar emprestimo={emprestimo} />
            <dl className="grid gap-4 sm:grid-cols-3">
              <Dado rotulo="Retirada">{formatarDataHora(emprestimo.dataHoraRetirada)}</Dado>
              <Dado rotulo="Devolver até">
                <span className="font-semibold">{formatarDataHora(emprestimo.prazoDevolucao)}</span>
              </Dado>
              <Dado rotulo="Devolução">{emprestimo.dataHoraDevolucao ? formatarDataHora(emprestimo.dataHoraDevolucao) : "Pendente"}</Dado>
            </dl>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Responsáveis" />
          <PanelBody>
            <dl className="space-y-3">
              <Dado rotulo="Membro">
                <MonoId id={emprestimo.membroId} voce={proprio} />
              </Dado>
              <Dado rotulo="Staff na retirada">
                <MonoId id={emprestimo.staffRetiradaId} voce={emprestimo.staffRetiradaId === usuario.id} />
              </Dado>
              <Dado rotulo="Staff na devolução">
                <MonoId id={emprestimo.staffDevolucaoId} voce={emprestimo.staffDevolucaoId === usuario.id} />
              </Dado>
              <Dado rotulo="Ferramenta">
                {ferramenta.ok ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <Link href={rotaFerramenta(ferramenta.data.id)} className="hover:text-brand-ink">
                      {ferramenta.data.codigo}
                    </Link>
                    <StatusBadge status={ferramenta.data.status} />
                  </span>
                ) : (
                  <MonoId id={emprestimo.ferramentaId} />
                )}
              </Dado>
            </dl>
          </PanelBody>
        </Panel>
      </div>

      <section className="mt-6" aria-labelledby="titulo-checklists">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="titulo-checklists" className="text-base font-semibold">
              Checklists de conservação
            </h2>
            <p className="text-sm text-muted-foreground">Registros imutáveis feitos no balcão, lado a lado.</p>
          </div>
          {divergencias.length > 0 && (
            <span className="text-sm font-medium text-status-repair">
              {divergencias.length} {divergencias.length === 1 ? "diferença" : "diferenças"} entre retirada e devolução
            </span>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ChecklistView
            titulo="Retirada"
            checklist={emprestimo.checklistRetirada}
            destaque={camposDivergentes}
            usuarioAtualId={usuario.id}
          />
          <ChecklistView
            titulo="Devolução"
            checklist={emprestimo.checklistDevolucao}
            destaque={camposDivergentes}
            usuarioAtualId={usuario.id}
            vazio={aberto ? "A devolução ainda não foi registrada." : "Sem checklist de devolução."}
          />
        </div>
      </section>
    </>
  );
}

function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="eyebrow">{rotulo}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}
