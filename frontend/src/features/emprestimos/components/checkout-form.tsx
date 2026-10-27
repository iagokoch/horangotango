"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, CheckCircle2, Plus } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { toast } from "sonner";

import { Callout } from "@/components/shared/callout";
import { CopyButton } from "@/components/shared/copy-button";
import { ErrorPanel } from "@/components/shared/error-panel";
import { MonoId } from "@/components/shared/mono-id";
import { ToolTag } from "@/components/shared/tool-tag";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Ferramenta } from "@/features/ferramentas/types";
import type { ActionError } from "@/lib/api/errors";
import { formatarDataCurta, formatarDataHora } from "@/lib/format";
import { ROTAS, rotaEmprestimo } from "@/lib/rotas";
import { cn } from "@/lib/utils";

import { acaoRegistrarRetirada } from "../actions";
import { acompanhar } from "../acompanhamento";
import { CHECKLIST_VAZIO, checklistFormSchema, retiradaFormSchema, type ValoresRetirada } from "../schemas";
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
  const checklist = useWatch({ control: form.control, name: "checklist" });
  const selecionada = ferramentas.find((ferramenta) => ferramenta.id === ferramentaId);
  const semPrazo = diasPrazo === null;
  // Progresso das etapas só para orientação visual; a validação de verdade é a do schema.
  const etapasOk = [Boolean(selecionada), Boolean(membroId?.trim()), checklistFormSchema.safeParse(checklist).success];

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
      <form onSubmit={form.handleSubmit(confirmar)} noValidate className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] xl:gap-12">
        <div className="min-w-0 space-y-6">
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

          <ol className="space-y-0">
            <Etapa numero={1} concluida={etapasOk[0]} titulo="Ferramenta" descricao="Somente ferramentas disponíveis no momento da consulta.">
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

            <Etapa numero={2} concluida={etapasOk[1]} titulo="Membro" descricao="Quem leva a ferramenta e responde pela devolução.">
              <FormField
                control={form.control}
                name="membroId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID do membro</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="off"
                        spellCheck={false}
                        className="font-mono text-sm"
                        placeholder="00000000-0000-0000-0000-000000000000"
                      />
                    </FormControl>
                    <FormDescription>
                      O membro encontra o próprio ID em <strong className="font-semibold text-foreground">Meu perfil</strong>. A
                      API confere se o membro existe e se há atraso pendente.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Etapa>

            <Etapa
              numero={3}
              concluida={etapasOk[2]}
              titulo="Checklist de conservação"
              descricao="Confira a ferramenta com o membro. O registro é imutável depois de confirmado."
              ultima
            >
              <ChecklistFields control={form.control} prefixo="checklist" legenda="Checklist de retirada" />
            </Etapa>
          </ol>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border bg-surface-sunken">
            <div className="border-b border-dashed px-5 py-4">
              <h2 className="text-lg font-semibold">Ficha de retirada</h2>
              <p className="text-sm text-muted-foreground">Confira antes de confirmar.</p>
            </div>
            <dl className="space-y-4 px-5 py-4">
              <Resumo rotulo="Ferramenta" ok={etapasOk[0]}>
                {selecionada ? (
                  <span className="flex min-w-0 flex-col items-start gap-1.5">
                    <ToolTag codigo={selecionada.codigo} />
                    <span className="font-semibold leading-snug">{selecionada.nome}</span>
                  </span>
                ) : (
                  <span className="text-subtle">Não selecionada</span>
                )}
              </Resumo>
              <Resumo rotulo="Membro" ok={etapasOk[1]}>
                {membroId?.trim() ? <MonoId id={membroId.trim()} /> : <span className="text-subtle">Não informado</span>}
              </Resumo>
              <Resumo rotulo="Checklist" ok={etapasOk[2]}>
                {etapasOk[2] ? "Completo" : <span className="text-subtle">Pendente</span>}
              </Resumo>
            </dl>
            <div className="border-t border-dashed px-5 py-5">
              {previsao ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="stamp shrink-0 text-foreground" suppressHydrationWarning>
                    <span className="text-xs font-semibold">Devolver até</span>
                    <span className="whitespace-nowrap font-display text-2xl font-bold">{formatarDataCurta(previsao)}</span>
                  </span>
                  <p className="text-right text-sm text-muted-foreground">
                    <span className="tabular block font-semibold text-foreground">
                      {diasPrazo} {diasPrazo === 1 ? "dia corrido" : "dias corridos"}
                    </span>
                    data final calculada pela API
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {semPrazo ? "Sem prazo padrão, a retirada não pode ser confirmada." : "O prazo será calculado pela API."}
                </p>
              )}
              <Button type="submit" size="lg" className="mt-5 w-full" loading={enviando} disabled={semPrazo}>
                {!enviando && <CheckCircle2 aria-hidden />}
                {enviando ? "Confirmando…" : "Confirmar retirada"}
              </Button>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Ao confirmar, a ferramenta passa a constar como emprestada e o prazo fica gravado no empréstimo.
              </p>
            </div>
          </div>
        </aside>
      </form>
    </Form>
  );
}

// Etapa do roteiro de retirada. As etapas são de fato uma sequência, por isso numeradas, ligadas
// por um trilho; o número vira um visto quando a etapa está preenchida.
function Etapa({
  numero,
  titulo,
  descricao,
  concluida,
  ultima = false,
  children,
}: {
  numero: number;
  titulo: string;
  descricao: string;
  concluida: boolean;
  ultima?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className={cn("relative pl-12 sm:pl-14", !ultima && "pb-10")}>
      {!ultima && <span aria-hidden className="absolute bottom-0 left-[15px] top-10 w-0.5 rounded-full bg-border" />}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-0 flex size-8 items-center justify-center rounded-full border-2 text-base font-bold transition-colors duration-200",
          concluida ? "border-foreground bg-foreground text-background" : "border-border-strong bg-surface text-muted-foreground",
        )}
      >
        {concluida ? <Check className="size-4" strokeWidth={3} /> : numero}
      </span>
      <h2 className="text-xl font-semibold leading-8">
        <span className="sr-only">Etapa {numero}: </span>
        {titulo}
        {concluida && <span className="sr-only"> (preenchida)</span>}
      </h2>
      <p className="mb-4 text-base text-muted-foreground">{descricao}</p>
      {children}
    </li>
  );
}

function Resumo({ rotulo, ok, children }: { rotulo: string; ok: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
      <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span aria-hidden className={cn("size-1.5 rounded-full", ok ? "bg-status-available" : "bg-border-strong")} />
        {rotulo}
      </dt>
      <dd className="min-w-0 text-base">{children}</dd>
    </div>
  );
}

// Comprovante exibido após a confirmação. O código do empréstimo é o que o membro usa para
// consultar o prazo depois (a API não lista os empréstimos de um membro na N2). O carimbo de
// devolução entra com um movimento curto: é a resposta à confirmação.
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
    <div className="mx-auto max-w-2xl">
      <div role="status" className="mb-6 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-status-available text-white">
          <CheckCircle2 className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-2xl font-bold">Retirada confirmada</h2>
          <p className="text-base text-muted-foreground">Entregue o código do empréstimo ao membro.</p>
        </div>
      </div>

      <article className="rounded-xl border bg-surface shadow-raised">
        <div className="grid gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-6">
          <div className="min-w-0 space-y-5">
            <div>
              <p className="text-sm text-muted-foreground">Código do empréstimo</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="min-w-0 break-all font-mono text-base font-semibold">{emprestimo.id}</span>
                <CopyButton valor={emprestimo.id} rotulo="Copiar código" compacto />
              </div>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-sm text-muted-foreground">Ferramenta</dt>
                <dd className="mt-1 flex flex-wrap items-center gap-2 text-base">
                  {ferramenta ? (
                    <>
                      <ToolTag codigo={ferramenta.codigo} />
                      <span className="font-semibold">{ferramenta.nome}</span>
                    </>
                  ) : (
                    <MonoId id={emprestimo.ferramentaId} />
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Membro</dt>
                <dd className="mt-1">
                  <MonoId id={emprestimo.membroId} />
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Retirada</dt>
                <dd className="mt-1 text-base">{formatarDataHora(emprestimo.dataHoraRetirada)}</dd>
              </div>
            </dl>
          </div>
          <div className="flex items-start sm:justify-end">
            <span className="stamp animate-stamp-in text-status-loan">
              <span className="text-xs font-semibold">Devolver até</span>
              <span className="font-display text-3xl font-bold">{formatarDataCurta(emprestimo.prazoDevolucao)}</span>
              <span className="text-xs">{formatarDataHora(emprestimo.prazoDevolucao)}</span>
            </span>
          </div>
        </div>

        <div aria-hidden className="relative">
          <div className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full border bg-surface [clip-path:inset(0_0_0_50%)]" />
          <div className="mx-4 border-t-2 border-dashed" />
          <div className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full border bg-surface [clip-path:inset(0_50%_0_0)]" />
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {emprestimo.checklistRetirada && <ChecklistView titulo="Checklist da retirada" checklist={emprestimo.checklistRetirada} />}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onNovaRetirada}>
              <Plus aria-hidden />
              Nova retirada
            </Button>
            <Button asChild>
              <Link href={rotaEmprestimo(emprestimo.id)}>Abrir empréstimo</Link>
            </Button>
          </div>
        </div>
      </article>
    </div>
  );
}
