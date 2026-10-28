"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/api/errors";
import { executarAcao } from "@/lib/api/server";
import { ROTAS, rotaFerramenta } from "@/lib/rotas";

import { cadastrarFerramenta, editarFerramenta } from "./api";
import { statusDestino, type AcaoCicloVida } from "./status";
import type { DadosCadastroFerramenta, DadosEdicaoFerramenta, Ferramenta } from "./types";

function revalidarCatalogo(id?: string) {
  revalidatePath(ROTAS.ferramentas);
  revalidatePath(ROTAS.painel);
  if (id) revalidatePath(rotaFerramenta(id));
}

export async function acaoCadastrarFerramenta(
  dados: DadosCadastroFerramenta,
): Promise<ActionResult<Ferramenta>> {
  const resultado = await executarAcao(() => cadastrarFerramenta(dados));
  if (resultado.ok) revalidarCatalogo();
  return resultado;
}

export async function acaoEditarFerramenta(
  id: string,
  dados: DadosEdicaoFerramenta,
): Promise<ActionResult<Ferramenta>> {
  const resultado = await executarAcao(() => editarFerramenta(id, dados));
  if (resultado.ok) revalidarCatalogo(id);
  return resultado;
}

// Inativar não é excluir: o registro e o histórico continuam, só sai de circulação (FR-4).
export async function acaoAlterarCicloVida(
  id: string,
  versao: number,
  acao: AcaoCicloVida,
): Promise<ActionResult<Ferramenta>> {
  const resultado = await executarAcao(() =>
    editarFerramenta(id, { status: statusDestino(acao), versao }),
  );
  if (resultado.ok) revalidarCatalogo(id);
  return resultado;
}
