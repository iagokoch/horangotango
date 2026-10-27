import "server-only";

import { redirect } from "next/navigation";

import { apagarSessao } from "@/lib/auth/session";
import { ROTAS } from "@/lib/rotas";

import { ApiError, type ActionResult } from "./errors";

const STATUS_NAO_AUTENTICADO = 401;

// Server Actions: converte falhas HTTP e de rede em ActionResult. 401 significa token vencido ou
// recusado pela API: a sessão local é descartada e o usuário volta ao login. Qualquer outro erro
// (ex.: resposta fora do contrato) continua sendo lançado, pois não é algo que ele consiga corrigir.
export async function executarAcao<T>(operacao: () => Promise<T>): Promise<ActionResult<T>> {
  let resultado: ActionResult<T>;
  try {
    resultado = { ok: true, data: await operacao() };
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw error;
    }
    resultado = { ok: false, error: error.toActionError() };
  }

  // redirect() lança um erro de controle do Next; fica fora do try/catch para não ser capturado.
  if (!resultado.ok && resultado.error.status === STATUS_NAO_AUTENTICADO) {
    apagarSessao();
    redirect(`${ROTAS.login}?motivo=expirada`);
  }
  return resultado;
}

export type Carregamento<T> = { ok: true; data: T } | { ok: false; error: ApiError };

// Server Components: devolve o erro HTTP como dado para a página decidir o que mostrar
// (painel de erro, notFound, acesso negado). Componentes de servidor não podem apagar cookies,
// então o 401 passa pelo route handler de sessão expirada.
export async function carregar<T>(operacao: () => Promise<T>): Promise<Carregamento<T>> {
  let resultado: Carregamento<T>;
  try {
    resultado = { ok: true, data: await operacao() };
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw error;
    }
    resultado = { ok: false, error };
  }

  if (!resultado.ok && resultado.error.status === STATUS_NAO_AUTENTICADO) {
    redirect(ROTAS.sessaoExpirada);
  }
  return resultado;
}
