"use server";

import { revalidatePath } from "next/cache";

import { ApiError, type ActionResult } from "@/lib/api/errors";
import { executarAcao } from "@/lib/api/server";
import { ROTAS, rotaEmprestimo, rotaFerramenta } from "@/lib/rotas";
import { buscarFerramenta } from "@/features/ferramentas/api";

import { buscarEmprestimo, registrarDevolucao, registrarRetirada } from "./api";
import type { DadosDevolucao, DadosRetirada, Emprestimo } from "./types";

function revalidarOperacao(emprestimo: Emprestimo) {
  revalidatePath(ROTAS.ferramentas);
  revalidatePath(ROTAS.painel);
  revalidatePath(rotaFerramenta(emprestimo.ferramentaId));
  revalidatePath(rotaEmprestimo(emprestimo.id));
}

export async function acaoRegistrarRetirada(dados: DadosRetirada): Promise<ActionResult<Emprestimo>> {
  const resultado = await executarAcao(() => registrarRetirada(dados));
  if (resultado.ok) revalidarOperacao(resultado.data);
  return resultado;
}

export async function acaoRegistrarDevolucao(
  id: string,
  dados: DadosDevolucao,
): Promise<ActionResult<Emprestimo>> {
  const resultado = await executarAcao(() => registrarDevolucao(id, dados));
  if (resultado.ok) revalidarOperacao(resultado.data);
  return resultado;
}

export interface ItemAcompanhado {
  id: string;
  emprestimo: Emprestimo | null;
  ferramenta: { codigo: string; nome: string } | null;
  // Status HTTP quando o empréstimo não pôde ser lido (403 de outro membro, 404 inexistente).
  erro: number | null;
}

const MAXIMO_CONSULTA = 30;

// Atualiza os empréstimos acompanhados neste dispositivo. Cada item é lido da API na hora: o
// índice local guarda só identificadores, nunca o estado do empréstimo.
export async function acaoConsultarAcompanhados(ids: string[]): Promise<ActionResult<ItemAcompanhado[]>> {
  const unicos = Array.from(new Set(ids)).slice(0, MAXIMO_CONSULTA);
  return executarAcao(async () => {
    const ferramentas = new Map<string, Promise<{ codigo: string; nome: string } | null>>();
    const lerFerramenta = (id: string) => {
      if (!ferramentas.has(id)) {
        ferramentas.set(
          id,
          buscarFerramenta(id).then(
            (ferramenta) => ({ codigo: ferramenta.codigo, nome: ferramenta.nome }),
            () => null,
          ),
        );
      }
      return ferramentas.get(id)!;
    };

    return Promise.all(
      unicos.map(async (id): Promise<ItemAcompanhado> => {
        try {
          const emprestimo = await buscarEmprestimo(id);
          return { id, emprestimo, ferramenta: await lerFerramenta(emprestimo.ferramentaId), erro: null };
        } catch (error) {
          // 401 sobe para executarAcao, que encerra a sessão; os demais ficam por item.
          if (error instanceof ApiError && error.status !== 401) {
            return { id, emprestimo: null, ferramenta: null, erro: error.status };
          }
          throw error;
        }
      }),
    );
  });
}
