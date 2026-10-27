import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Pencil } from "lucide-react";

import { Callout } from "@/components/shared/callout";
import { ErrorPanel } from "@/components/shared/error-panel";
import { MonoId } from "@/components/shared/mono-id";
import { PageHeader } from "@/components/shared/page-header";
import { RetryButton } from "@/components/shared/retry-button";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { buscarFerramenta } from "@/features/ferramentas/api";
import { LifecycleActions } from "@/features/ferramentas/components/lifecycle-actions";
import { LifecycleTrack } from "@/features/ferramentas/components/lifecycle-track";
import { StatusBadge } from "@/features/ferramentas/components/status-badge";
import { META_STATUS } from "@/features/ferramentas/status";
import { carregar } from "@/lib/api/server";
import { exigirUsuario } from "@/lib/auth/session";
import { formatarDataHora, formatarMoeda } from "@/lib/format";
import { ROTAS, rotaEdicaoFerramenta, rotaRetiradaDaFerramenta } from "@/lib/rotas";

export const metadata: Metadata = { title: "Ferramenta" };

export default async function FerramentaPage({ params }: { params: { id: string } }) {
  const usuario = exigirUsuario();
  const staff = usuario.papel === "STAFF";
  const resultado = await carregar(() => buscarFerramenta(params.id));

  if (!resultado.ok) {
    if (resultado.error.status === 404) notFound();
    return <ErrorPanel erro={resultado.error} titulo="Não foi possível carregar a ferramenta" acao={<RetryButton />} />;
  }

  const ferramenta = resultado.data;
  const meta = META_STATUS[ferramenta.status];

  return (
    <>
      <PageHeader
        eyebrow={<span className="font-mono">{ferramenta.codigo}</span>}
        title={ferramenta.nome}
        meta={
          <>
            <StatusBadge status={ferramenta.status} />
            <span className="text-sm text-muted-foreground">{ferramenta.categoria}</span>
          </>
        }
        actions={
          staff && (
            <>
              <Button asChild variant="secondary">
                <Link href={rotaEdicaoFerramenta(ferramenta.id)}>
                  <Pencil aria-hidden />
                  Editar
                </Link>
              </Button>
              {ferramenta.status === "AVAILABLE" && (
                <Button asChild>
                  <Link href={rotaRetiradaDaFerramenta(ferramenta.id)}>
                    <ArrowUpRight aria-hidden />
                    Registrar retirada
                  </Link>
                </Button>
              )}
            </>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Ficha técnica" />
            <PanelBody>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Campo rotulo="Código">
                  <span className="font-mono">{ferramenta.codigo}</span>
                </Campo>
                <Campo rotulo="Categoria">{ferramenta.categoria}</Campo>
                <Campo rotulo="Valor estimado">
                  <span className="font-mono tabular">{formatarMoeda(ferramenta.valorEstimado)}</span>
                </Campo>
                <Campo rotulo="Situação">{meta.descricao}</Campo>
                <div className="sm:col-span-2">
                  <Campo rotulo="Estado de conservação">
                    <span className="whitespace-pre-line">{ferramenta.estadoConservacao}</span>
                  </Campo>
                </div>
              </dl>
            </PanelBody>
          </Panel>

          {ferramenta.status === "ON_LOAN" && (
            <Callout tone="info" title="Ferramenta emprestada">
              A API ainda não informa qual empréstimo está com a ferramenta (a consulta por ferramenta e por membro é
              uma pendência da N3). Abra o empréstimo pelo código do comprovante em{" "}
              <Link href={ROTAS.emprestimos} className="font-medium text-foreground underline underline-offset-4">
                Empréstimos
              </Link>
              .
            </Callout>
          )}

          <Panel>
            <PanelHeader title="Registro" description="Auditoria gravada pela API a cada alteração." />
            <PanelBody>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Campo rotulo="Cadastrada em">{formatarDataHora(ferramenta.dataHoraCriacao)}</Campo>
                <Campo rotulo="Cadastrada por">
                  <MonoId id={ferramenta.idUsuarioCriacao} voce={ferramenta.idUsuarioCriacao === usuario.id} />
                </Campo>
                <Campo rotulo="Última alteração">{formatarDataHora(ferramenta.dataHoraAlteracao)}</Campo>
                <Campo rotulo="Alterada por">
                  <MonoId id={ferramenta.idUsuarioAlteracao} voce={ferramenta.idUsuarioAlteracao === usuario.id} />
                </Campo>
                <Campo rotulo="Versão do registro">
                  <span className="font-mono">{ferramenta.versao}</span>
                </Campo>
                <Campo rotulo="Identificador">
                  <span className="break-all font-mono text-xs">{ferramenta.id}</span>
                </Campo>
              </dl>
            </PanelBody>
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel>
            <PanelHeader title="Ciclo de vida" description="Retirada e devolução mudam o status automaticamente." />
            <PanelBody className="space-y-4">
              <LifecycleTrack atual={ferramenta.status} />
              {staff && (
                <div className="border-t pt-4">
                  <p className="mb-2 text-sm font-medium">Ações do Staff</p>
                  <LifecycleActions ferramenta={ferramenta} />
                </div>
              )}
            </PanelBody>
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="eyebrow">{rotulo}</dt>
      <dd className="mt-1 text-base">{children}</dd>
    </div>
  );
}
