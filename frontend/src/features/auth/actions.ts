"use server";

import { redirect } from "next/navigation";

import { apiRequest, apiRequestRaw } from "@/lib/api/client";
import { ApiError, falha, type ActionResult } from "@/lib/api/errors";
import { apagarSessao, gravarSessao } from "@/lib/auth/session";
import { loginResponseSchema, usuarioSchema, type Usuario } from "@/lib/auth/types";
import { ROTAS } from "@/lib/rotas";

import { contaSchema, destinoSeguro, loginSchema, type DadosConta, type DadosLogin } from "./schemas";

// Login: a API devolve o JWT, que fica num cookie httpOnly do servidor Next. O token nunca chega
// ao JavaScript do navegador nem aparece em logs.
export async function acaoEntrar(dados: DadosLogin, destino?: string): Promise<ActionResult> {
  const validacao = loginSchema.safeParse(dados);
  if (!validacao.success) {
    return falha(400, "Informe e-mail e senha.");
  }

  try {
    const resposta = await apiRequest("/auth/login", loginResponseSchema, {
      method: "POST",
      body: validacao.data,
      publico: true,
    });
    gravarSessao(resposta);
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, error: error.toActionError() };
    }
    throw error;
  }

  redirect(destinoSeguro(destino, ROTAS.painel));
}

// Autocadastro: sempre cria um MEMBER (FR-1). Contas Staff só são criadas por outro Staff.
export async function acaoCadastrar(dados: DadosConta): Promise<ActionResult<Usuario>> {
  const validacao = contaSchema.safeParse(dados);
  if (!validacao.success) {
    return falha(400, "Revise os dados do cadastro.");
  }
  try {
    const usuario = await apiRequest("/auth/register", usuarioSchema, {
      method: "POST",
      body: validacao.data,
      publico: true,
    });
    return { ok: true, data: usuario };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, error: error.toActionError() };
    }
    throw error;
  }
}

// Logout: a API é stateless e só responde 204 (o token continua válido até expirar, revogação é
// N3). O que encerra a sessão de fato é descartar o cookie, feito mesmo se a API estiver fora.
export async function acaoSair(): Promise<void> {
  try {
    await apiRequestRaw("/auth/logout", { method: "POST" });
  } catch {
    // Falha no aviso ao servidor não impede o encerramento local.
  }
  apagarSessao();
  redirect(`${ROTAS.login}?motivo=saiu`);
}
