import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";

import { LogoMark } from "@/components/layout/logo";
import { Avatar, PapelBadge } from "@/components/layout/user-menu";
import { CopyButton } from "@/components/shared/copy-button";
import { DataList, DataRow } from "@/components/shared/data-list";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { obterSessao } from "@/lib/auth/session";
import { ROTULO_PAPEL } from "@/lib/auth/types";
import { formatarDataHora } from "@/lib/format";
import { ROTAS } from "@/lib/rotas";

export const metadata: Metadata = { title: "Meu perfil" };

export default function PerfilPage() {
  const sessao = obterSessao();
  if (!sessao) redirect(ROTAS.sessaoExpirada);
  const { usuario } = sessao;
  const membro = usuario.papel === "MEMBER";

  return (
    <div className="max-w-4xl">
      <PageHeader title="Meu perfil" description="Seus dados de acesso e o identificador usado no balcão." />

      <div className="grid gap-8 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* Cartão de balcão: o Staff precisa do ID para registrar a retirada (não há busca de membros na API). */}
        <section aria-labelledby="titulo-cartao" className="space-y-3">
          <div className="ink-panel relative overflow-hidden rounded-xl p-5 shadow-overlay">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex items-center gap-2">
                <LogoMark className="size-6" />
                <span className="font-display text-base font-bold">Monitoolring</span>
              </span>
              <PapelBadge papel={usuario.papel} />
            </div>
            <div className="mt-8 flex items-center gap-3">
              <Avatar nome={usuario.nome} className="size-11 bg-brand text-base text-brand-foreground" />
              <div className="min-w-0">
                <h2 id="titulo-cartao" className="truncate text-lg font-semibold leading-6">
                  {usuario.nome}
                </h2>
                <p className="truncate text-sm text-[hsl(var(--ink-muted))]">{usuario.email}</p>
              </div>
            </div>
            <div className="mt-6 border-t border-dashed border-[hsl(var(--ink-line))] pt-4">
              <p className="text-sm text-[hsl(var(--ink-muted))]">{membro ? "ID para o balcão" : "Identificador da conta"}</p>
              <p className="mt-1 break-all font-mono text-sm font-medium">{usuario.id}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {membro ? "Informe este ID ao Staff ao retirar uma ferramenta." : "Usado nos registros de auditoria."}
            </p>
            <CopyButton valor={usuario.id} rotulo="Copiar ID" />
          </div>
        </section>

        <div className="min-w-0 space-y-6">
          <Panel>
            <PanelHeader title="Conta" />
            <PanelBody>
              <DataList>
                <DataRow rotulo="Nome">{usuario.nome}</DataRow>
                <DataRow rotulo="E-mail">
                  <span className="break-all">{usuario.email}</span>
                </DataRow>
                <DataRow rotulo="Papel">
                  {ROTULO_PAPEL[usuario.papel]}
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {membro ? "Consulta o acervo e os próprios empréstimos." : "Opera o balcão, o acervo e as configurações."}
                  </span>
                </DataRow>
              </DataList>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader icon={<KeyRound />} title="Sessão" description="O acesso é renovado a cada login." />
            <PanelBody className="space-y-2 text-base leading-relaxed">
              <p>
                Sua sessão expira em <strong className="font-semibold">{formatarDataHora(sessao.expiraEm)}</strong>. Depois
                disso, será preciso entrar novamente.
              </p>
              <p className="text-muted-foreground">
                Ao encerrar a sessão, o token é descartado deste navegador. A API atual não revoga tokens no servidor
                (pendência N3).
              </p>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  );
}
