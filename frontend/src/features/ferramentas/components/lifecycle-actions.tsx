"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Lock } from "lucide-react";
import { toast } from "sonner";

import { ErrorPanel } from "@/components/shared/error-panel";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionError } from "@/lib/api/errors";

import { acaoAlterarCicloVida } from "../actions";
import { acoesCicloVida, type AcaoCicloVida } from "../status";
import type { Ferramenta } from "../types";

const TEXTO: Record<AcaoCicloVida, { botao: string; titulo: string; descricao: string; sucesso: string }> = {
  INATIVAR: {
    botao: "Inativar",
    titulo: "Inativar ferramenta?",
    descricao:
      "A ferramenta sai de circulação e não poderá ser retirada. O registro e todo o histórico continuam no sistema: inativar não é excluir, e você pode reativá-la depois.",
    sucesso: "inativada",
  },
  REATIVAR: {
    botao: "Reativar",
    titulo: "Reativar ferramenta?",
    descricao: "A ferramenta volta a ficar disponível para retirada no balcão.",
    sucesso: "disponível novamente",
  },
};

export function LifecycleActions({ ferramenta }: { ferramenta: Ferramenta }) {
  const acoes = acoesCicloVida(ferramenta.status);

  if (acoes.length === 0) {
    return (
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        Ferramenta emprestada não muda de status. Registre a devolução primeiro.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {acoes.map((acao) => (
        <ConfirmarCicloVida key={acao} ferramenta={ferramenta} acao={acao} />
      ))}
    </div>
  );
}

function ConfirmarCicloVida({ ferramenta, acao }: { ferramenta: Ferramenta; acao: AcaoCicloVida }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<ActionError | null>(null);
  const texto = TEXTO[acao];
  const Icone = acao === "INATIVAR" ? Archive : ArchiveRestore;

  async function confirmar() {
    setErro(null);
    setEnviando(true);
    const resultado = await acaoAlterarCicloVida(ferramenta.id, ferramenta.versao, acao);
    setEnviando(false);
    if (!resultado.ok) {
      setErro(resultado.error);
      return;
    }
    toast.success(`${resultado.data.codigo} ${texto.sucesso}.`);
    setAberto(false);
    router.refresh();
  }

  return (
    <AlertDialog
      open={aberto}
      onOpenChange={(valor) => {
        setAberto(valor);
        if (!valor) setErro(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant={acao === "INATIVAR" ? "secondary" : "primary"} size="sm">
          <Icone aria-hidden />
          {texto.botao}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{texto.titulo}</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="mb-2 block font-mono text-xs text-foreground">
              {ferramenta.codigo} · {ferramenta.nome}
            </span>
            {texto.descricao}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {erro && (
          <ErrorPanel
            erro={erro}
            titulo={`Não foi possível ${texto.botao.toLowerCase()}`}
            contexto={{
              409: {
                orientacao: "Feche esta janela; a página será atualizada com o estado atual da ferramenta.",
              },
            }}
          />
        )}
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              if (erro?.status === 409) router.refresh();
            }}
          >
            {erro ? "Fechar" : "Cancelar"}
          </AlertDialogCancel>
          {!erro && (
            <Button variant={acao === "INATIVAR" ? "destructive" : "primary"} loading={enviando} onClick={confirmar}>
              {texto.botao}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
