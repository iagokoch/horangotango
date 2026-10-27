"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, CalendarClock, CheckCircle2, ClipboardList, Plus, UserRound, Wrench } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { toast } from "sonner";

import { Callout } from "@/components/shared/callout";
import { CopyButton } from "@/components/shared/copy-button";
import { ErrorPanel } from "@/components/shared/error-panel";
import { MonoId } from "@/components/shared/mono-id";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import type { Ferramenta } from "@/features/ferramentas/types";
import type { ActionError } from "@/lib/api/errors";
import { formatarDataHora } from "@/lib/format";
import { ROTAS, rotaEmprestimo } from "@/lib/rotas";

import { acaoRegistrarRetirada } from "../actions";
import { acompanhar } from "../acompanhamento";
import { CHECKLIST_VAZIO, retiradaFormSchema, type ValoresRetirada } from "../schemas";
import { ehBloqueioPorAtraso } from "../situacao";
import type { Emprestimo } from "../types";
import { BlockedPanel } from "./blocked-panel";
import { ChecklistFields } from "./checklist-fields";
import { ChecklistView } from "./checklist-view";
import { ToolPicker } from "./tool-picker";

type DadosRetiradaForm = z.output<typeof retiradaFormSchema>;

interface CheckoutFormProps {
  ferramentas: Ferramenta[];
  ferramentaInicialId?: string;
  // null: a API respondeu 404 (prazo nunca configurado). undefined: não foi possível consultar.
  diasPrazo: number | null | undefined;
  staffId: string;
}

const DIA_MS = 24 * 60 * 60 * 1000;

export function CheckoutForm({ ferramentas, ferramentaInicialId, diasPrazo, staffId }: CheckoutFormProps) {
  const router = useRouter();
  const [erro, setErro] = useState<ActionError | null>(null);
  const [confirmado, setConfirmado] = useState<Emprestimo | null>(null);

  const inicialValida = ferramentas.some((ferramenta) => ferramenta.id === ferramentaInicialId);
  const form = useForm<ValoresRetirada, unknown, DadosRetiradaForm>({
    resolver: zodResolver(retiradaFormSchema),
    defaultValues: {
      ferramentaId: inicialValida ? ferramentaInicialId : "",
      membroId: "",
      checklist: CHECKLIST_VAZIO,
    },
    mode: "onTouched",
  });

  const ferramentaId = useWatch({ control: form.control, name: "ferramentaId" });
  const membroId = useWatch({ control: form.control, name: "membroId" });
  const selecionada = ferramentas.find((ferramenta) => ferramenta.id === ferramentaId);
  const semPrazo = diasPrazo === null;

  async function confirmar(dados: DadosRetiradaForm) {
    setErro(null);
    const resultado = await acaoRegistrarRetirada({
      ferramentaId: dados.ferramentaId,
      membroId: dados.membroId,
      checklist: dados.checklist,
    });

    if (!resultado.ok) {
      const { status, message } = resultado.error;
      setErro(resultado.error);
      if (status === 404 && message.startsWith("Membro")) {
        form.setError("membroId", { type: "server", message: "Nenhum membro com este ID." });
      } else if (status === 422 && message.includes("Staff")) {
        form.setError("membroId", { type: "server", message: "Este ID é de uma conta Staff. Empréstimos são só para membros." });
      } else if (status === 409 && message.startsWith("A ferramenta")) {
        // Outra estação retirou a ferramenta: atualiza a lista de disponíveis.
        form.setValue("ferramentaId", "");
        router.refresh();
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    acompanhar(staffId, resultado.data.id);
    setConfirmado(resultado.data);
    toast.success("Retirada confirmada.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (confirmado) {
    return (
      <Comprovante
        emprestimo={confirmado}
        ferramenta={ferramentas.find((ferramenta) => ferramenta.id === confirmado.ferramentaId)}
        onNovaRetirada={() => {
          setConfirmado(null);
          form.reset({ ferramentaId: "", membroId: "", checklist: CHECKLIST_VAZIO });
          router.refresh();
        }}
      />
    );
  }

  const previsao = diasPrazo ? new Date(Date.now() + diasPrazo * DIA_MS).toISOString() : null;
  const enviando = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(confirmar)} noValidate className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          {semPrazo && (
            <Callout
              tone="danger"
              title="Prazo padrão de devolução não configurado"
              action={
                <Button asChild size="sm" variant="secondary">
                  <Link href={ROTAS.configuracoes}>Configurar prazo</Link>
                </Button>
              }
            >
              A API recusa qualquer retirada enquanto um Staff não definir o prazo padrão.
            </Callout>
          )}
          {diasPrazo === undefined && (
            <Callout tone="warning" title="Não foi possível consultar o prazo vigente">
              A retirada pode ser registrada; o prazo será calculado pela API no momento da confirmação.
            </Callout>
          )}

          {erro &&
            (ehBloqueioPorAtraso(erro) ? (
              <BlockedPanel detalhes={erro.details} mensagem={erro.message} />
            ) : (
              <ErrorPanel
                erro={erro}
                titulo="A retirada não foi confirmada"
                contexto={{
                  409: erro.message.startsWith("A ferramenta")
                    ? { orientacao: "A lista de ferramentas disponíveis foi atualizada. Selecione outra." }
                    : { orientacao: "Defina o prazo padrão em Configurações e tente novamente." },
                  404: { orientacao: "Confira o ID informado e tente novamente." },
                }}
              />
            ))}

          <Etapa numero="01" titulo="Ferramenta" icone={<Wrench />} descricao="Somente ferramentas disponíveis no momento da consulta.">
            <FormField
              control={form.control}
              name="ferramentaId"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="sr-only" id="rotulo-ferramenta">
                    Ferramenta a retirar
                  </FormLabel>
                  <ToolPicker
                    ferramentas={ferramentas}
                    valor={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    invalido={!!fieldState.error}
                    idRotulo="rotulo-ferramenta"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </Etapa>

          <Etapa numero="02" titulo="Membro" icone={<UserRound />} descricao="Quem leva a ferramenta e responde pela devolução.">
            <FormField
              control={form.control}
              name="membroId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID do membro</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="off" spellCheck={false} className="font-mono" placeholder="00000000-0000-0000-0000-000000000000" />
                  </FormControl>
                  <FormDescription>
                    O membro encontra o próprio ID em <strong className="font-medium text-foreground">Meu perfil</strong>. A
                    API confere se o membro existe e se há atraso pendente.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Etapa>

          <Etapa
            numero="03"
            titulo="Checklist de conservação"
            icone={<ClipboardList />}
            descricao="Confira a ferramenta com o membro. O registro é imutável depois de confirmado."
          >
            <ChecklistFields control={form.control} prefixo="checklist" legenda="Checklist de retirada" />
          </Etapa>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Panel>
            <PanelHeader title="Resumo da retirada" icon={<ArrowUpRight />} />
            <PanelBody className="space-y-4 text-sm">
              <Resumo rotulo="Ferramenta">
                {selecionada ? (
                  <>
                    <span className="block font-mono text-xs">{selecionada.codigo}</span>
                    <span className="block font-medium">{selecionada.nome}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Não selecionada</span>
                )}
              </Resumo>
              <Resumo rotulo="Membro">
                {membroId?.trim() ? <MonoId id={membroId.trim()} /> : <span className="text-muted-foreground">Não informado</span>}
              </Resumo>
              <Resumo rotulo="Prazo vigente">
                {diasPrazo ? (
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="size-4 text-muted-foreground" aria-hidden />
                    {diasPrazo} {diasPrazo === 1 ? "dia corrido" : "dias corridos"}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Resumo>
              {previsao && (
                <Resumo rotulo="Devolução prevista">
                  <span suppressHydrationWarning>{formatarDataHora(previsao)}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">Calculada pela API na confirmação.</span>
                </Resumo>
              )}
              <Button type="submit" size="lg" className="w-full" loading={enviando} disabled={semPrazo}>
                {!enviando && <CheckCircle2 aria-hidden />}
                {enviando ? "Confirmando…" : "Confirmar retirada"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Ao confirmar, a ferramenta passa a constar como emprestada e o prazo é gravado no empréstimo.
              </p>
            </PanelBody>
          </Panel>
        </aside>
      </form>
    </Form>
  );
}

function Etapa({
  numero,
  titulo,
  descricao,
  icone,
  children,
}: {
  numero: string;
  titulo: string;
  descricao: string;
  icone: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Panel>
      <div className="flex items-start gap-3 border-b px-4 py-3">
        <span className="font-mono text-xs font-semibold text-brand-ink">{numero}</span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-base font-semibold [&_svg]:size-4 [&_svg]:text-muted-foreground">
            {icone}
            {titulo}
          </h2>
          <p className="text-sm text-muted-foreground">{descricao}</p>
        </div>
      </div>
      <PanelBody>{children}</PanelBody>
    </Panel>
  );
}

function Resumo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-1">{rotulo}</p>
      <div>{children}</div>
    </div>
  );
}

// Comprovante exibido após a confirmação. O código do empréstimo é o que o membro usa para
// consultar o prazo depois (a API não lista os empréstimos de um membro na N2).
function Comprovante({
  emprestimo,
  ferramenta,
  onNovaRetirada,
}: {
  emprestimo: Emprestimo;
  ferramenta?: Ferramenta;
  onNovaRetirada: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <Panel className="overflow-hidden">
        <div className="flex items-center gap-3 border-b bg-status-available/[0.07] px-5 py-4">
          <span className="flex size-10 items-center justify-center rounded-full bg-status-available text-background">
            <CheckCircle2 className="size-5" aria-hidden />
          </span>
          <div role="status">
            <h2 className="text-lg font-semibold">Retirada confirmada</h2>
            <p className="text-sm text-muted-foreground">Entregue o código do empréstimo ao membro.</p>
          </div>
        </div>
        <PanelBody className="space-y-5 p-5">
          <div className="rounded-lg border border-dashed p-4">
            <p className="eyebrow">Código do empréstimo</p>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="break-all font-mono text-base font-semibold">{emprestimo.id}</span>
              <CopyButton valor={emprestimo.id} rotulo="Copiar código" />
            </div>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="eyebrow">Ferramenta</dt>
              <dd className="mt-1">
                {ferramenta ? `${ferramenta.codigo} · ${ferramenta.nome}` : <MonoId id={emprestimo.ferramentaId} />}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Membro</dt>
              <dd className="mt-1">
                <MonoId id={emprestimo.membroId} />
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Retirada</dt>
              <dd className="mt-1">{formatarDataHora(emprestimo.dataHoraRetirada)}</dd>
            </div>
            <div>
              <dt className="eyebrow">Devolver até</dt>
              <dd className="mt-1 font-semibold">{formatarDataHora(emprestimo.prazoDevolucao)}</dd>
            </div>
          </dl>
          {emprestimo.checklistRetirada && <ChecklistView titulo="Checklist da retirada" checklist={emprestimo.checklistRetirada} />}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={onNovaRetirada}>
              <Plus aria-hidden />
              Nova retirada
            </Button>
            <Button asChild>
              <Link href={rotaEmprestimo(emprestimo.id)}>Abrir empréstimo</Link>
            </Button>
          </div>
        </PanelBody>
      </Panel>
    </div>
  );
}
