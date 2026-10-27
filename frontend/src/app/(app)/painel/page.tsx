import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, CalendarClock, PackagePlus, Search, Warehouse } from "lucide-react";

import { Callout } from "@/components/shared/callout";
import { CopyButton } from "@/components/shared/copy-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorPanel } from "@/components/shared/error-panel";
import { PageHeader } from "@/components/shared/page-header";
import { RetryButton } from "@/components/shared/retry-button";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { buscarPrazo, type PrazoDevolucao } from "@/features/configuracoes/api";
import { LoanLookup } from "@/features/emprestimos/components/loan-lookup";
import { TrackedLoans } from "@/features/emprestimos/components/tracked-loans";
import { listarFerramentas } from "@/features/ferramentas/api";
import { contarPorStatus, resumirPorCategoria } from "@/features/ferramentas/status";
import type { Ferramenta } from "@/features/ferramentas/types";
import { CategoryBars } from "@/features/painel/components/category-bars";
import { InventoryStrip } from "@/features/painel/components/inventory-strip";
import { ShadowBoard } from "@/features/painel/components/shadow-board";
import { carregar, type Carregamento } from "@/lib/api/server";
import { exigirUsuario } from "@/lib/auth/session";
import type { Usuario } from "@/lib/auth/types";
import { formatarDataLonga, formatarMoedaCompacta } from "@/lib/format";
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
  const data = formatarDataLonga(new Date());

  return (
    <>
      <PageHeader
        eyebrow={<span className="first-letter:uppercase">{data}</span>}
        title={`${saudacao()}, ${primeiroNome}`}
        description={staff ? "Situação do acervo e do balcão neste momento." : "Veja o que está disponível e acompanhe os seus prazos."}
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
        className="mb-6"
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
    <Callout tone="warning" title="Não foi possível consultar o prazo padrão" className="mb-6">
      O restante do painel continua atualizado.
    </Callout>
  );
}

function Conteudo({ ferramentas, usuario, prazo }: { ferramentas: Ferramenta[]; usuario: Usuario; prazo: PrazoDevolucao | null }) {
  const staff = usuario.papel === "STAFF";
  const contagem = contarPorStatus(ferramentas);
  const patrimonio = ferramentas
    .filter((ferramenta) => ferramenta.status !== "INACTIVE")
    .reduce((soma, ferramenta) => soma + ferramenta.valorEstimado, 0);
  const categorias = resumirPorCategoria(ferramentas);

  if (ferramentas.length === 0) {
    return (
      <div className="space-y-6">
        {!staff && <CartaoBalcao usuario={usuario} />}
        <EmptyState
          className="rounded-xl border"
          icon={<Warehouse />}
          title="O acervo ainda está vazio"
          description={
            staff ? "Cadastre as ferramentas da oficina para começar a operar o balcão." : "A equipe da oficina ainda não cadastrou ferramentas."
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
    <div className="space-y-8">
      <InventoryStrip contagem={contagem} total={ferramentas.length} />

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(19rem,1fr)]">
        <section aria-labelledby="titulo-quadro" className="min-w-0">
          <SectionHeading
            id="titulo-quadro"
            title="Quadro de ferramentas"
            description="Cada vaga é uma ferramenta. Vaga tracejada: está fora da oficina."
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link href={ROTAS.ferramentas}>Abrir catálogo</Link>
              </Button>
            }
          />
          <ShadowBoard ferramentas={ferramentas} />
        </section>

        <div className="space-y-6">
          {staff ? <ResumoBalcao prazo={prazo} patrimonio={patrimonio} /> : <CartaoBalcao usuario={usuario} />}

          <Panel>
            <PanelHeader
              title={staff ? "Próximos vencimentos" : "Meus prazos"}
              description="Empréstimos acompanhados neste dispositivo."
              actions={
                <Button asChild variant="ghost" size="sm">
                  <Link href={ROTAS.emprestimos}>Ver todos</Link>
                </Button>
              }
            />
            <PanelBody className="space-y-5">
              <TrackedLoans usuarioId={usuario.id} papel={usuario.papel} compacto limite={5} />
              <div className="border-t pt-5">
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

// Números do balcão que não são contagem de status: o prazo aplicado a cada retirada e o valor do
// que está em circulação (referência em caso de dano ou perda).
function ResumoBalcao({ prazo, patrimonio }: { prazo: PrazoDevolucao | null; patrimonio: number }) {
  return (
    <div className="grid grid-cols-2 divide-x rounded-lg border">
      <Link
        href={ROTAS.configuracoes}
        className="group rounded-l-lg p-4 transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground group-hover:text-foreground">
          <CalendarClock className="size-4" aria-hidden />
          Prazo padrão
        </span>
        <span className="mt-1.5 block font-display text-3xl font-bold tabular">
          {prazo ? (
            <>
              {prazo.dias}
              <span className="ml-1 font-sans text-base font-normal text-muted-foreground">{prazo.dias === 1 ? "dia" : "dias"}</span>
            </>
          ) : (
            <span className="text-status-overdue">—</span>
          )}
        </span>
      </Link>
      <div className="p-4">
        <span className="text-sm text-muted-foreground">Patrimônio em circulação</span>
        <span className="mt-1.5 block font-display text-3xl font-bold tabular">{formatarMoedaCompacta(patrimonio)}</span>
      </div>
    </div>
  );
}

// O Staff registra a retirada pelo ID do membro (a API não oferece busca de membros), então o
// painel do membro deixa esse ID sempre à mão.
function CartaoBalcao({ usuario }: { usuario: Usuario }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-border-strong p-4">
      <p className="text-sm font-semibold">Seu ID para o balcão</p>
      <p className="mt-1 text-sm text-muted-foreground">Informe ao Staff ao retirar uma ferramenta.</p>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-md bg-surface-sunken p-2 pl-3">
        <span className="min-w-0 break-all font-mono text-sm font-medium">{usuario.id}</span>
        <CopyButton valor={usuario.id} rotulo="Copiar ID" compacto />
      </div>
    </div>
  );
}
