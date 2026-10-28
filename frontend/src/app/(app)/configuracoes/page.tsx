import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Callout } from "@/components/shared/callout";
import { ErrorPanel } from "@/components/shared/error-panel";
import { MonoId } from "@/components/shared/mono-id";
import { PageHeader } from "@/components/shared/page-header";
import { RetryButton } from "@/components/shared/retry-button";
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
    <div className="max-w-5xl">
      <PageHeader title="Configurações" description="Regras da oficina e contas da equipe. Disponível apenas para Staff." />

      <div className="divide-y border-t">
        <Secao
          id="prazo"
          titulo="Prazo padrão de devolução"
          descricao="Aplicado a cada nova retirada no momento da confirmação."
          extra={
            prazo.ok ? (
              <div className="mt-5 rounded-lg border bg-surface-sunken p-4">
                <p className="text-sm text-muted-foreground">Vigente</p>
                <p className="mt-1 font-display text-5xl font-bold tabular leading-none">
                  {prazo.data.dias}
                  <span className="ml-2 font-sans text-lg font-normal text-muted-foreground">{prazo.data.dias === 1 ? "dia" : "dias"}</span>
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Alterado em {formatarDataHora(prazo.data.dataHoraAlteracao)}
                  <span className="mt-0.5 flex items-center gap-1">
                    por <MonoId id={prazo.data.idUsuarioAlteracao} voce={prazo.data.idUsuarioAlteracao === staff.id} />
                  </span>
                </p>
              </div>
            ) : null
          }
        >
          <div className="space-y-5">
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
          </div>
        </Secao>

        <Secao
          id="equipe"
          titulo="Nova conta Staff"
          descricao="Contas Staff só podem ser criadas por outro Staff e têm acesso ao balcão e às configurações. Membros se cadastram pela tela pública."
        >
          <StaffForm />
        </Secao>
      </div>
    </div>
  );
}

function Secao({
  id,
  titulo,
  descricao,
  extra,
  children,
}: {
  id: string;
  titulo: string;
  descricao: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`titulo-${id}`} className="grid gap-6 py-10 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:gap-12">
      <div>
        <h2 id={`titulo-${id}`} className="text-xl font-semibold">
          {titulo}
        </h2>
        <p className="mt-1.5 text-base leading-relaxed text-muted-foreground">{descricao}</p>
        {extra}
      </div>
      <div className="min-w-0 max-w-xl">{children}</div>
    </section>
  );
}
