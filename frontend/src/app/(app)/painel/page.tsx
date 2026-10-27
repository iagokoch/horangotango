import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CircleCheck,
  PackagePlus,
  Search,
  ShieldOff,
  Warehouse,
} from "lucide-react";

import { Callout } from "@/components/shared/callout";
import { CopyButton } from "@/components/shared/copy-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorPanel } from "@/components/shared/error-panel";
import { PageHeader } from "@/components/shared/page-header";
import { RetryButton } from "@/components/shared/retry-button";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { buscarPrazo, type PrazoDevolucao } from "@/features/configuracoes/api";
import { LoanLookup } from "@/features/emprestimos/components/loan-lookup";
import { TrackedLoans } from "@/features/emprestimos/components/tracked-loans";
import { listarFerramentas } from "@/features/ferramentas/api";
import { contarPorStatus, resumirPorCategoria } from "@/features/ferramentas/status";
import type { Ferramenta } from "@/features/ferramentas/types";
import { CategoryBars } from "@/features/painel/components/category-bars";
import { KpiTile } from "@/features/painel/components/kpi-tile";
import { ShadowBoard } from "@/features/painel/components/shadow-board";
import { carregar, type Carregamento } from "@/lib/api/server";
import { exigirUsuario } from "@/lib/auth/session";
import type { Usuario } from "@/lib/auth/types";
import { formatarDataLonga, formatarMoedaCompacta, plural } from "@/lib/format";
import { ROTAS } from "@/lib/rotas";

export const metadata: Metadata = { title: "Painel" };

function saudacao(): string {
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()),
  );
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

// Painel operacional. Todos os números vêm de GET /api/tools (e, para Staff, do prazo vigente):
// a API não tem endpoint agregador, então as métricas são contagens sobre o acervo consultado.
export default async function PainelPage() {
  const usuario = exigirUsuario();
  const staff = usuario.papel === "STAFF";
  const [ferramentas, prazo] = await Promise.all([
    carregar(() => listarFerramentas()),
    staff ? carregar(() => buscarPrazo()) : Promise.resolve(null),
  ]);
  const primeiroNome = usuario.nome.split(/\s+/)[0];

  return (
    <>
      <PageHeader
        eyebrow={formatarDataLonga(new Date())}
        title={`${saudacao()}, ${primeiroNome}`}
        description={staff ? "Situação do acervo e do balcão agora." : "Veja o que está disponível e acompanhe seus prazos."}
        actions={staff ? <AcoesStaff /> : <AcoesMembro />}
      />

      {staff && prazo && <AlertaPrazo prazo={prazo} />}

      {ferramentas.ok ? (
        <Conteudo ferramentas={ferramentas.data} usuario={usuario} prazo={prazo?.ok ? prazo.data : null} />
      ) : (
        <ErrorPanel erro={ferramentas.error} titulo="Não foi possível carregar o acervo" acao={<RetryButton />} />
      )}
    </>
  );
}

function AcoesStaff() {
  return (
    <>
      <Button asChild variant="secondary">
        <Link href={ROTAS.emprestimos}>
          <ArrowDownLeft aria-hidden />
          Registrar devolução
        </Link>
      </Button>
      <Button asChild>
        <Link href={ROTAS.novaRetirada}>
          <ArrowUpRight aria-hidden />
          Registrar retirada
        </Link>
      </Button>
    </>
  );
}

function AcoesMembro() {
  return (
    <Button asChild variant="secondary">
      <Link href={ROTAS.ferramentas}>
        <Search aria-hidden />
        Buscar no catálogo
      </Link>
    </Button>
  );
}

function AlertaPrazo({ prazo }: { prazo: Carregamento<PrazoDevolucao> }) {
  if (prazo.ok) return null;
  if (prazo.error.status === 404) {
    return (
      <Callout
        tone="danger"
        title="Retiradas bloqueadas: prazo padrão não configurado"
        className="mb-5"
        action={
          <Button asChild size="sm" variant="secondary">
            <Link href={ROTAS.configuracoes}>
              <CalendarClock aria-hidden />
              Configurar prazo
            </Link>
          </Button>
        }
      >
        A API recusa toda retirada até que um Staff defina o prazo padrão de devolução.
      </Callout>
    );
  }
  return (
    <Callout tone="warning" title="Não foi possível consultar o prazo padrão" className="mb-5">
      O restante do painel continua atualizado.
    </Callout>
  );
}

function Conteudo({ ferramentas, usuario, prazo }: { ferramentas: Ferramenta[]; usuario: Usuario; prazo: PrazoDevolucao | null }) {
  const staff = usuario.papel === "STAFF";
  const contagem = contarPorStatus(ferramentas);
  const emCirculacao = ferramentas.length - contagem.INACTIVE;
  const fora = contagem.UNDER_REPAIR + contagem.LOST + contagem.INACTIVE;
  const patrimonio = ferramentas
    .filter((ferramenta) => ferramenta.status !== "INACTIVE")
    .reduce((soma, ferramenta) => soma + ferramenta.valorEstimado, 0);
  const categorias = resumirPorCategoria(ferramentas);

  if (ferramentas.length === 0) {
    return (
      <div className="space-y-5">
        {!staff && <CartaoBalcao usuario={usuario} />}
        <EmptyState
        icon={<Warehouse />}
        title="O acervo ainda está vazio"
        description={
          staff ? "Cadastre ferramentas para começar a operar o balcão." : "A equipe da oficina ainda não cadastrou ferramentas."
        }
        action={
          staff && (
            <Button asChild>
              <Link href={ROTAS.novaFerramenta}>
                <PackagePlus aria-hidden />
                Cadastrar ferramenta
              </Link>
            </Button>
          )
        }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!staff && <CartaoBalcao usuario={usuario} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          rotulo="Disponíveis"
          icone={<CircleCheck />}
          valor={contagem.AVAILABLE}
          fracao={emCirculacao ? contagem.AVAILABLE / emCirculacao : 0}
          corFracao="bg-status-available"
          detalhe={`de ${plural(emCirculacao, "ferramenta em circulação", "ferramentas em circulação")}`}
        />
        <KpiTile
          rotulo="Emprestadas"
          icone={<ArrowUpRight />}
          valor={contagem.ON_LOAN}
          fracao={emCirculacao ? contagem.ON_LOAN / emCirculacao : 0}
          corFracao="bg-status-loan"
          detalhe={staff ? "Cada uma corresponde a um empréstimo ativo." : "Fora da oficina neste momento."}
        />
        <KpiTile
          rotulo="Fora de circulação"
          icone={<ShieldOff />}
          valor={fora}
          detalhe={`${contagem.UNDER_REPAIR} em reparo · ${contagem.LOST} perdidas · ${contagem.INACTIVE} inativas`}
        />
        {staff ? (
          <KpiTile
            rotulo="Prazo padrão"
            icone={<CalendarClock />}
            valor={prazo ? `${prazo.dias}d` : "—"}
            destaque={prazo ? undefined : "danger"}
            detalhe={
              <>
                Patrimônio em circulação: <span className="font-mono">{formatarMoedaCompacta(patrimonio)}</span>
              </>
            }
          />
        ) : (
          <KpiTile rotulo="Acervo" icone={<Warehouse />} valor={ferramentas.length} detalhe={plural(categorias.length, "categoria", "categorias")} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Panel className="self-start">
          <PanelHeader
            title="Quadro de sombras"
            description="Cada vaga é uma ferramenta do acervo. Vaga tracejada: fora da oficina."
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link href={ROTAS.ferramentas}>Ver catálogo</Link>
              </Button>
            }
          />
          <PanelBody>
            <ShadowBoard ferramentas={ferramentas} />
          </PanelBody>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <PanelHeader
              title={staff ? "Próximos vencimentos" : "Meus prazos"}
              description="Empréstimos acompanhados neste dispositivo."
              actions={
                <Button asChild variant="ghost" size="sm">
                  <Link href={ROTAS.emprestimos}>Todos</Link>
                </Button>
              }
            />
            <PanelBody className="space-y-4">
              <TrackedLoans usuarioId={usuario.id} papel={usuario.papel} compacto limite={5} />
              <div className="border-t pt-4">
                <LoanLookup />
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Disponibilidade por categoria" />
            <PanelBody>
              <CategoryBars resumo={categorias} />
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// O Staff registra a retirada pelo ID do membro (a API não oferece busca de membros), então o
// painel do membro deixa esse ID sempre à mão.
function CartaoBalcao({ usuario }: { usuario: Usuario }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border-strong bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="eyebrow">Seu ID para o balcão</p>
        <p className="mt-1 break-all font-mono text-base font-semibold">{usuario.id}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Informe ao Staff ao retirar uma ferramenta.</p>
      </div>
      <CopyButton valor={usuario.id} rotulo="Copiar ID" />
    </div>
  );
}
