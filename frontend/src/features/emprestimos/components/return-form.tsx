"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownLeft, CopyCheck, GitCompareArrows } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Callout } from "@/components/shared/callout";
import { ErrorPanel } from "@/components/shared/error-panel";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel";
import type { ActionError } from "@/lib/api/errors";
import { rotaEmprestimo } from "@/lib/rotas";

import { acaoRegistrarDevolucao } from "../actions";
import { acompanhar } from "../acompanhamento";
import { checklistFormSchema, CHECKLIST_VAZIO, devolucaoFormSchema, type ValoresDevolucao } from "../schemas";
import { compararChecklists } from "../situacao";
import type { DadosChecklist, Emprestimo } from "../types";
import { ChecklistFields } from "./checklist-fields";
import { ChecklistView } from "./checklist-view";

type DadosDevolucaoForm = z.output<typeof devolucaoFormSchema>;

interface ReturnFormProps {
  emprestimo: Emprestimo;
  staffId: string;
}

// Devolução guiada para o balcão: o checklist da retirada fica ao lado do novo registro, e as
// diferenças são destacadas antes da confirmação.
export function ReturnForm({ emprestimo, staffId }: ReturnFormProps) {
  const router = useRouter();
  const [erro, setErro] = useState<ActionError | null>(null);
  const [revisao, setRevisao] = useState<DadosDevolucaoForm | null>(null);
  const [enviando, setEnviando] = useState(false);
  const retirada = emprestimo.checklistRetirada;

  const form = useForm<ValoresDevolucao, unknown, DadosDevolucaoForm>({
    resolver: zodResolver(devolucaoFormSchema),
    defaultValues: { checklist: CHECKLIST_VAZIO },
    mode: "onTouched",
  });

  const atual = useWatch({ control: form.control, name: "checklist" });
  const divergencias = useMemo(() => {
    const valido = checklistFormSchema.safeParse(atual);
    if (!retirada || !valido.success) return null;
    return compararChecklists(retirada, valido.data as DadosChecklist);
  }, [atual, retirada]);
  const camposDivergentes = new Set(divergencias?.map((divergencia) => divergencia.campo));

  function copiarDaRetirada() {
    if (!retirada) return;
    form.setValue(
      "checklist",
      {
        estadoFuncional: retirada.estadoFuncional,
        avariasVisiveis: retirada.avariasVisiveis,
        acessoriosInclusos: [...retirada.acessoriosInclusos],
      },
      { shouldValidate: true, shouldDirty: true },
    );
  }

  async function confirmar() {
    if (!revisao) return;
    setErro(null);
    setEnviando(true);
    const resultado = await acaoRegistrarDevolucao(emprestimo.id, { checklist: revisao.checklist });
    setEnviando(false);
    setRevisao(null);
    if (!resultado.ok) {
      setErro(resultado.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    acompanhar(staffId, emprestimo.id);
    toast.success("Devolução registrada. A ferramenta voltou ao acervo como disponível.");
    router.push(rotaEmprestimo(emprestimo.id));
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((dados) => setRevisao(dados))} noValidate className="space-y-5">
        {erro && (
          <ErrorPanel
            erro={erro}
            titulo="A devolução não foi registrada"
            contexto={{
              409: { orientacao: "Este empréstimo já foi encerrado. Abra o empréstimo para ver o registro." },
            }}
            acao={
              erro.status === 409 && (
                <Button asChild variant="secondary" size="sm">
                  <Link href={rotaEmprestimo(emprestimo.id)}>Abrir empréstimo</Link>
                </Button>
              )
            }
          />
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Como saiu</h2>
              <span className="text-xs text-muted-foreground">Registro da retirada (imutável)</span>
            </div>
            <ChecklistView
              titulo="Checklist da retirada"
              checklist={retirada}
              destaque={camposDivergentes}
              usuarioAtualId={staffId}
              vazio="A API não retornou o checklist da retirada."
            />
            {divergencias && divergencias.length > 0 && (
              <Callout tone="warning" title="Diferenças em relação à retirada" role="status">
                <ul className="list-disc space-y-0.5 pl-4">
                  {divergencias.map((divergencia) => (
                    <li key={divergencia.descricao}>{divergencia.descricao}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs">
                  O registro formal de divergência, que encaminharia a ferramenta para reparo/inspeção, ainda não existe na
                  API (FR-15, N3). A devolução registra este checklist e a ferramenta volta como disponível. Se ela não puder
                  circular, inative-a na ficha da ferramenta após confirmar.
                </p>
              </Callout>
            )}
            {divergencias && divergencias.length === 0 && (
              <Callout tone="success" title="Sem diferenças em relação à retirada" role="status" />
            )}
          </div>

          <Panel>
            <PanelHeader
              title="Como voltou"
              description="Confira a ferramenta com o membro presente."
              icon={<GitCompareArrows />}
              actions={
                retirada && (
                  <Button type="button" variant="ghost" size="sm" onClick={copiarDaRetirada}>
                    <CopyCheck aria-hidden />
                    <span className="hidden sm:inline">Igual à retirada</span>
                  </Button>
                )
              }
            />
            <PanelBody>
              <ChecklistFields control={form.control} prefixo="checklist" legenda="Checklist de devolução" />
            </PanelBody>
            <PanelFooter>
              <Button asChild variant="ghost">
                <Link href={rotaEmprestimo(emprestimo.id)}>Cancelar</Link>
              </Button>
              <Button type="submit">
                <ArrowDownLeft aria-hidden />
                Revisar devolução
              </Button>
            </PanelFooter>
          </Panel>
        </div>
      </form>

      <AlertDialog open={revisao !== null} onOpenChange={(aberto) => !aberto && !enviando && setRevisao(null)}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar devolução?</AlertDialogTitle>
            <AlertDialogDescription>
              O empréstimo será encerrado, o checklist ficará registrado de forma permanente e a ferramenta voltará a ficar
              disponível.
              {divergencias && divergencias.length > 0 && (
                <strong className="mt-2 block font-medium text-status-repair">
                  Há {divergencias.length} {divergencias.length === 1 ? "diferença" : "diferenças"} em relação à retirada.
                </strong>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {revisao && <ChecklistView titulo="Checklist da devolução" checklist={revisao.checklist as DadosChecklist} />}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviando}>Voltar e revisar</AlertDialogCancel>
            <Button loading={enviando} onClick={confirmar}>
              {enviando ? "Registrando…" : "Confirmar devolução"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
