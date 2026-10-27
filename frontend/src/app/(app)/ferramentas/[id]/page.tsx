import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Pencil } from "lucide-react";

import { Callout } from "@/components/shared/callout";
import { CopyButton } from "@/components/shared/copy-button";
import { DataList, DataRow } from "@/components/shared/data-list";
import { ErrorPanel } from "@/components/shared/error-panel";
import { MonoId } from "@/components/shared/mono-id";
import { PageHeader } from "@/components/shared/page-header";
import { RetryButton } from "@/components/shared/retry-button";
import { ToolTag } from "@/components/shared/tool-tag";
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
        eyebrow={
          <>
            <ToolTag codigo={ferramenta.codigo} grande />
            <span>{ferramenta.categoria}</span>
          </>
        }
        title={ferramenta.nome}
        meta={
          <>
            <StatusBadge status={ferramenta.status} />
            <span className="text-base text-muted-foreground">{meta.descricao}</span>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)] lg:gap-8">
        <div className="min-w-0 space-y-6">
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
            <PanelHeader title="Ficha técnica" />
            <PanelBody>
              <DataList>
                <DataRow rotulo="Código">
                  <ToolTag codigo={ferramenta.codigo} />
                </DataRow>
                <DataRow rotulo="Nome">{ferramenta.nome}</DataRow>
                <DataRow rotulo="Categoria">{ferramenta.categoria}</DataRow>
                <DataRow rotulo="Valor estimado">
                  <span className="tabular font-semibold">{formatarMoeda(ferramenta.valorEstimado)}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">Referência em caso de dano ou perda.</span>
                </DataRow>
                <DataRow rotulo="Estado de conservação">
                  <p className="whitespace-pre-line leading-relaxed">{ferramenta.estadoConservacao}</p>
                </DataRow>
              </DataList>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Registro" description="Auditoria gravada pela API a cada alteração." />
            <PanelBody>
              <ol className="relative space-y-5 border-l-2 border-dashed border-border pl-6">
                <Marco titulo="Cadastrada" quando={ferramenta.dataHoraCriacao}>
                  <MonoId id={ferramenta.idUsuarioCriacao} voce={ferramenta.idUsuarioCriacao === usuario.id} />
                </Marco>
                <Marco titulo="Última alteração" quando={ferramenta.dataHoraAlteracao} atual>
                  <MonoId id={ferramenta.idUsuarioAlteracao} voce={ferramenta.idUsuarioAlteracao === usuario.id} />
                </Marco>
              </ol>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-sunken p-3 pl-4">
                <div className="min-w-0 text-sm text-muted-foreground">
                  Versão <span className="tabular font-semibold text-foreground">{ferramenta.versao}</span>
                  <span className="mt-0.5 block break-all font-mono text-xs text-foreground">{ferramenta.id}</span>
                </div>
                <CopyButton valor={ferramenta.id} rotulo="Copiar identificador" compacto />
              </div>
            </PanelBody>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel>
            <PanelHeader title="Ciclo de vida" description="Retirada e devolução mudam o status sozinhas." />
            <PanelBody className="space-y-5">
              <LifecycleTrack atual={ferramenta.status} />
              {staff && (
                <div className="border-t pt-5">
                  <p className="mb-3 text-base font-semibold">Ações do Staff</p>
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

function Marco({
  titulo,
  quando,
  atual = false,
  children,
}: {
  titulo: string;
  quando: string | null | undefined;
  atual?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="relative">
      <span
        aria-hidden
        className={
          atual
            ? "absolute -left-8 top-1 size-3.5 rounded-full border-2 border-surface bg-foreground ring-2 ring-foreground"
            : "absolute -left-8 top-1 size-3.5 rounded-full border-2 border-border-strong bg-surface"
        }
      />
      <p className="text-base font-semibold">{titulo}</p>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <time dateTime={quando ?? undefined}>{formatarDataHora(quando)}</time>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1">por {children}</span>
      </p>
    </li>
  );
}
