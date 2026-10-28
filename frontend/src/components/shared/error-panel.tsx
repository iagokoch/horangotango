import type { ReactNode } from "react";

import { descreverErro } from "@/lib/api/mensagens";
import type { ActionError } from "@/lib/api/errors";

import { Callout } from "./callout";

interface ErrorPanelProps {
  erro: Pick<ActionError, "status" | "message"> & { details?: string[] };
  titulo: string;
  contexto?: Parameters<typeof descreverErro>[2];
  acao?: ReactNode;
  mostrarDetalhes?: boolean;
  className?: string;
}

// Bloco de erro padronizado: o quê (título), por quê (motivo vindo da API quando específico) e o
// que fazer (orientação). Fica ancorado na tela porque o toast some antes de o operador ler.
export function ErrorPanel({ erro, titulo, contexto, acao, mostrarDetalhes = true, className }: ErrorPanelProps) {
  const descricao = descreverErro(erro, titulo, contexto);
  const detalhes = mostrarDetalhes ? (erro.details ?? []) : [];
  return (
    <Callout tone="danger" title={descricao.titulo} action={acao} className={className} role="alert">
      <p>{descricao.motivo}</p>
      {detalhes.length > 0 && (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-sm">
          {detalhes.map((detalhe) => (
            <li key={detalhe}>{detalhe}</li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 text-xs">{descricao.orientacao}</p>
    </Callout>
  );
}
