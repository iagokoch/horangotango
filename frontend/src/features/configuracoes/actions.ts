"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/api/errors";
import { executarAcao } from "@/lib/api/server";
import type { Usuario } from "@/lib/auth/types";
import { ROTAS } from "@/lib/rotas";

import type { DadosConta } from "@/features/auth/schemas";

import { cadastrarStaff, definirPrazo, type PrazoDevolucao } from "./api";

export async function acaoDefinirPrazo(dias: number): Promise<ActionResult<PrazoDevolucao>> {
  const resultado = await executarAcao(() => definirPrazo(dias));
  if (resultado.ok) {
    revalidatePath(ROTAS.configuracoes);
    revalidatePath(ROTAS.painel);
    revalidatePath(ROTAS.novaRetirada);
  }
  return resultado;
}

export async function acaoCadastrarStaff(dados: DadosConta): Promise<ActionResult<Usuario>> {
  return executarAcao(() => cadastrarStaff(dados));
}
