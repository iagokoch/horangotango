"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCw, Save } from "lucide-react";
import { useForm, useWatch, type Control } from "react-hook-form";
import { toast } from "sonner";

import { ErrorPanel } from "@/components/shared/error-panel";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input, Textarea } from "@/components/ui/input";
import { ToolTag } from "@/components/shared/tool-tag";
import { cn } from "@/lib/utils";
import type { ActionError } from "@/lib/api/errors";
import { errosDeCampo } from "@/lib/api/mensagens";
import { ROTAS, rotaFerramenta } from "@/lib/rotas";

import { acaoCadastrarFerramenta, acaoEditarFerramenta } from "../actions";
import {
  CAMPOS_FERRAMENTA,
  formularioFerramentaSchema,
  LIMITES_FERRAMENTA,
  montarEdicao,
  valoresIniciaisDe,
  type DadosFormularioFerramenta,
  type ValoresFormularioFerramenta,
} from "../schemas";
import type { Ferramenta } from "../types";

const VAZIO: ValoresFormularioFerramenta = {
  codigo: "",
  nome: "",
  categoria: "",
  valorEstimado: "",
  estadoConservacao: "",
};

interface ToolFormProps {
  // Sem ferramenta: cadastro (POST). Com ferramenta: edição parcial (PATCH com versão).
  ferramenta?: Ferramenta;
  categoriasExistentes: string[];
}

export function ToolForm({ ferramenta, categoriasExistentes }: ToolFormProps) {
  const router = useRouter();
  const [erro, setErro] = useState<ActionError | null>(null);
  const [navegando, startTransition] = useTransition();
  const edicao = Boolean(ferramenta);

  const form = useForm<ValoresFormularioFerramenta, unknown, DadosFormularioFerramenta>({
    resolver: zodResolver(formularioFerramentaSchema),
    defaultValues: ferramenta ? valoresIniciaisDe(ferramenta) : VAZIO,
    mode: "onTouched",
  });

  async function salvar(dados: DadosFormularioFerramenta) {
    setErro(null);
    let resultado;
    if (ferramenta) {
      const alteracoes = montarEdicao(ferramenta, dados);
      if (Object.keys(alteracoes).length === 1) {
        toast.info("Nenhuma alteração para salvar.");
        return;
      }
      resultado = await acaoEditarFerramenta(ferramenta.id, alteracoes);
    } else {
      resultado = await acaoCadastrarFerramenta(dados);
    }

    if (!resultado.ok) {
      setErro(resultado.error);
      for (const { campo, mensagem } of errosDeCampo(resultado.error.details, CAMPOS_FERRAMENTA)) {
        form.setError(campo, { type: "server", message: mensagem });
      }
      if (resultado.error.status === 409 && resultado.error.message.toLowerCase().includes("código")) {
        form.setError("codigo", { type: "server", message: "Este código já está em uso por outra ferramenta." });
      }
      return;
    }

    toast.success(edicao ? `Ferramenta ${resultado.data.codigo} atualizada.` : `Ferramenta ${resultado.data.codigo} cadastrada.`);
    startTransition(() => {
      router.push(rotaFerramenta(resultado.data.id));
      router.refresh();
    });
  }

  const salvando = form.formState.isSubmitting || navegando;
  const conflitoVersao = erro?.status === 409 && !erro.message.toLowerCase().includes("código");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(salvar)} noValidate>
        <div>
          <div className="divide-y border-t">
            <Secao
              titulo="Identificação"
              descricao="O código é a etiqueta física da ferramenta e não pode se repetir no acervo."
              extra={<PreviaEtiqueta control={form.control} />}
            >
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <FormField
                  control={form.control}
                  name="codigo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          autoFocus={!edicao}
                          autoComplete="off"
                          spellCheck={false}
                          maxLength={LIMITES_FERRAMENTA.codigo}
                          className="font-mono uppercase"
                          onChange={(evento) => field.onChange(evento.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormDescription>Até {LIMITES_FERRAMENTA.codigo} caracteres.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="off" maxLength={LIMITES_FERRAMENTA.nome} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Secao>

            <Secao titulo="Classificação e valor" descricao="O valor estimado serve de referência em caso de dano ou perda.">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="categoria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Input {...field} list="categorias-existentes" autoComplete="off" maxLength={LIMITES_FERRAMENTA.categoria} />
                      </FormControl>
                      <datalist id="categorias-existentes">
                        {categoriasExistentes.map((categoria) => (
                          <option key={categoria} value={categoria} />
                        ))}
                      </datalist>
                      <FormDescription>Reaproveite uma categoria existente para manter o catálogo organizado.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="valorEstimado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor estimado</FormLabel>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                        <FormControl>
                          <Input
                            {...field}
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="0,00"
                            className="pl-9 font-mono tabular"
                            onChange={(evento) => field.onChange(evento.target.value.replace(/[^\d.,]/g, ""))}
                          />
                        </FormControl>
                      </div>
                      <FormDescription>Maior que zero, com até 2 casas decimais.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Secao>

            <Secao titulo="Conservação" descricao="Descreva o estado atual: desgaste, riscos, peças substituídas.">
              <FormField
                control={form.control}
                name="estadoConservacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado de conservação</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} maxLength={LIMITES_FERRAMENTA.estadoConservacao} />
                    </FormControl>
                    <FormDescription>
                      {(field.value ?? "").length}/{LIMITES_FERRAMENTA.estadoConservacao} caracteres
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Secao>

            {erro && (
              <div className="py-6">
                <ErrorPanel
                  erro={erro}
                  titulo="Não foi possível salvar a ferramenta"
                  contexto={{
                    409: conflitoVersao
                      ? {
                          motivo: "Outra pessoa alterou esta ferramenta enquanto você editava, ou o estado dela mudou.",
                          orientacao: "Recarregue para ver a versão atual. Seus dados digitados continuam no formulário.",
                        }
                      : { orientacao: "Escolha outro código." },
                    404: { motivo: "Esta ferramenta não existe mais.", orientacao: "Volte ao catálogo para ver a lista atualizada." },
                  }}
                  acao={
                    conflitoVersao && (
                      <Button type="button" variant="secondary" size="sm" onClick={() => router.refresh()}>
                        <RotateCw aria-hidden />
                        Recarregar dados
                      </Button>
                    )
                  }
                />
              </div>
            )}
          </div>
          {/* Barra de ações presa ao pé da tela: salvar fica ao alcance mesmo em formulários longos. */}
          <div className="sticky bottom-0 z-10 -mx-4 mt-2 flex flex-col-reverse gap-2 border-t bg-surface/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:flex-row sm:items-center sm:justify-end sm:px-6 lg:mx-0 lg:px-0">
            <p className="mr-auto hidden text-sm text-muted-foreground sm:block">
              {edicao ? "Só os campos alterados são enviados." : "A ferramenta entra no acervo como disponível."}
            </p>
            <Button asChild variant="ghost">
              <Link href={ferramenta ? rotaFerramenta(ferramenta.id) : ROTAS.ferramentas}>Cancelar</Link>
            </Button>
            <Button type="submit" loading={salvando}>
              {!salvando && <Save aria-hidden />}
              {salvando ? "Salvando…" : edicao ? "Salvar alterações" : "Cadastrar ferramenta"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

// Seção do formulário: título e orientação à esquerda, campos à direita. No celular, empilha.
function Secao({
  titulo,
  descricao,
  extra,
  children,
}: {
  titulo: string;
  descricao: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-5 py-8 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-10">
      <div>
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <p className="mt-1 text-base leading-relaxed text-muted-foreground">{descricao}</p>
        {extra}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

// Prévia de como a etiqueta da ferramenta vai aparecer no catálogo e no balcão.
function PreviaEtiqueta({
  control,
}: {
  control: Control<ValoresFormularioFerramenta, unknown, DadosFormularioFerramenta>;
}) {
  const [codigo, nome] = useWatch({ control, name: ["codigo", "nome"] });
  return (
    <div className="mt-5 hidden rounded-md border border-dashed bg-surface-sunken p-3 md:block" aria-hidden>
      <p className="mb-2 text-sm text-subtle">Prévia da etiqueta</p>
      <div className="flex min-w-0 items-center gap-2">
        <ToolTag codigo={codigo?.trim() || "CÓDIGO"} className={cn(!codigo?.trim() && "text-subtle")} />
        <span className={cn("truncate text-base font-semibold", !nome?.trim() && "font-normal text-subtle")}>
          {nome?.trim() || "Nome da ferramenta"}
        </span>
      </div>
    </div>
  );
}
