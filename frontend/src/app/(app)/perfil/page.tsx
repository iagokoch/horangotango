import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Contact, KeyRound } from "lucide-react";

import { Avatar, PapelBadge } from "@/components/layout/user-menu";
import { CopyButton } from "@/components/shared/copy-button";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { obterSessao } from "@/lib/auth/session";
import { formatarDataHora } from "@/lib/format";
import { ROTAS } from "@/lib/rotas";

export const metadata: Metadata = { title: "Meu perfil" };

export default function PerfilPage() {
  const sessao = obterSessao();
  if (!sessao) redirect(ROTAS.sessaoExpirada);
  const { usuario } = sessao;
  const membro = usuario.papel === "MEMBER";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Conta" title="Meu perfil" />

      <div className="space-y-5">
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 p-5">
            <Avatar nome={usuario.nome} className="size-12 text-base" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold">{usuario.nome}</p>
              <p className="truncate text-sm text-muted-foreground">{usuario.email}</p>
            </div>
            <PapelBadge papel={usuario.papel} />
          </div>

          {/* Cartão de balcão: o Staff precisa do ID para registrar a retirada (não há busca de membros na API). */}
          <div className="border-t border-dashed bg-surface-sunken/60 p-5">
            <p className="eyebrow flex items-center gap-1.5">
              <Contact className="size-3.5" aria-hidden />
              {membro ? "ID para o balcão" : "Identificador da conta"}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <span className="break-all font-mono text-lg font-semibold tracking-tight">{usuario.id}</span>
              <CopyButton valor={usuario.id} rotulo="Copiar ID" />
            </div>
            {membro && (
              <p className="mt-2 text-sm text-muted-foreground">
                Informe este ID ao Staff ao retirar uma ferramenta. Ele identifica você no empréstimo e no checklist.
              </p>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader icon={<KeyRound />} title="Sessão" description="O acesso é renovado a cada login." />
          <PanelBody className="space-y-2 text-sm">
            <p>
              Sua sessão expira em <strong className="font-medium">{formatarDataHora(sessao.expiraEm)}</strong>. Depois disso, será
              preciso entrar novamente.
            </p>
            <p className="text-muted-foreground">
              Ao encerrar a sessão, o token é descartado deste navegador. A API atual não revoga tokens no servidor (pendência N3).
            </p>
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
