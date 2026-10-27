import type { Metadata } from "next";
import { CalendarClock, UsersRound } from "lucide-react";

import { Callout } from "@/components/shared/callout";
import { ErrorPanel } from "@/components/shared/error-panel";
import { MonoId } from "@/components/shared/mono-id";
import { PageHeader } from "@/components/shared/page-header";
import { RetryButton } from "@/components/shared/retry-button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { buscarPrazo } from "@/features/configuracoes/api";
import { DeadlineForm } from "@/features/configuracoes/components/deadline-form";
import { StaffForm } from "@/features/configuracoes/components/staff-form";
import { carregar } from "@/lib/api/server";
import { exigirStaff } from "@/lib/auth/session";
import { formatarDataHora } from "@/lib/format";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const staff = exigirStaff();
  const prazo = await carregar(() => buscarPrazo());
  const naoConfigurado = !prazo.ok && prazo.error.status === 404;

  return (
    <>
      <PageHeader
        eyebrow="Administração"
        title="Configurações"
        description="Regras da oficina e contas da equipe. Disponível apenas para Staff."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel>
          <PanelHeader
            icon={<CalendarClock />}
            title="Prazo padrão de devolução"
            description="Aplicado a cada nova retirada no momento da confirmação."
          />
          <PanelBody className="space-y-5">
            {prazo.ok && (
              <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border bg-surface-sunken/60 p-4">
                <div>
                  <p className="eyebrow">Vigente</p>
                  <p className="mt-1 font-mono text-4xl font-semibold tabular">
                    {prazo.data.dias}
                    <span className="ml-1.5 font-sans text-base font-normal text-muted-foreground">
                      {prazo.data.dias === 1 ? "dia" : "dias"}
                    </span>
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Alterado em {formatarDataHora(prazo.data.dataHoraAlteracao)}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1">
                    por <MonoId id={prazo.data.idUsuarioAlteracao} voce={prazo.data.idUsuarioAlteracao === staff.id} />
                  </p>
                </div>
              </div>
            )}
            {naoConfigurado && (
              <Callout tone="danger" title="Prazo ainda não configurado">
                Enquanto nenhum prazo for definido, a API recusa todas as retiradas.
              </Callout>
            )}
            {!prazo.ok && !naoConfigurado ? (
              <ErrorPanel erro={prazo.error} titulo="Não foi possível consultar o prazo" acao={<RetryButton />} />
            ) : (
              <DeadlineForm diasAtuais={prazo.ok ? prazo.data.dias : null} />
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            icon={<UsersRound />}
            title="Nova conta Staff"
            description="Contas Staff só podem ser criadas por outro Staff. Membros se cadastram pela tela pública."
          />
          <PanelBody>
            <StaffForm />
          </PanelBody>
        </Panel>
      </div>
    </>
  );
}
