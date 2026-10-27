"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCw, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ErrorPanel } from "@/components/shared/error-panel";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input, Textarea } from "@/components/ui/input";
import { Panel, PanelBody, PanelFooter } from "@/components/ui/panel";
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
        <Panel>
          <PanelBody className="space-y-5 p-5">
            <Secao titulo="Identificação" descricao="O código é a etiqueta física da ferramenta e não pode se repetir no acervo.">
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
              <div>
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
          </PanelBody>
          <PanelFooter>
            <Button asChild variant="ghost">
              <Link href={ferramenta ? rotaFerramenta(ferramenta.id) : ROTAS.ferramentas}>Cancelar</Link>
            </Button>
            <Button type="submit" loading={salvando}>
              {!salvando && <Save aria-hidden />}
              {salvando ? "Salvando…" : edicao ? "Salvar alterações" : "Cadastrar ferramenta"}
            </Button>
          </PanelFooter>
        </Panel>
      </form>
    </Form>
  );
}

function Secao({ titulo, descricao, children }: { titulo: string; descricao: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t pt-5 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-8">
      <div>
        <h2 className="text-base font-semibold">{titulo}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}
