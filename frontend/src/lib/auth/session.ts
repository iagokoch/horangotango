import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { cookieSeguro } from "@/lib/env";

import { COOKIE_SESSAO, codificarSessao, decodificarSessao, sessaoExpirada } from "./session-codec";
import type { LoginResponse, Sessao, Usuario } from "./types";
import { ROTAS } from "@/lib/rotas";

export function obterSessao(): Sessao | null {
  const sessao = decodificarSessao(cookies().get(COOKIE_SESSAO)?.value);
  if (!sessao || sessaoExpirada(sessao)) {
    return null;
  }
  return sessao;
}

export function obterToken(): string | null {
  return obterSessao()?.token ?? null;
}

// Páginas protegidas chamam estas funções além do middleware: a checagem no servidor da página é a
// que vale caso uma rota nova seja esquecida no matcher. A autorização definitiva é sempre da API.
export function exigirUsuario(): Usuario {
  const sessao = obterSessao();
  if (!sessao) {
    redirect(ROTAS.sessaoExpirada);
  }
  return sessao.usuario;
}

export function exigirStaff(): Usuario {
  const usuario = exigirUsuario();
  if (usuario.papel !== "STAFF") {
    redirect(ROTAS.acessoNegado);
  }
  return usuario;
}

// Só pode ser chamada em Server Actions e Route Handlers (onde o Next permite escrever cookies).
export function gravarSessao(login: LoginResponse): void {
  const sessao: Sessao = { token: login.token, expiraEm: login.expiraEm, usuario: login.usuario };
  const expires = new Date(login.expiraEm);
  cookies().set(COOKIE_SESSAO, codificarSessao(sessao), {
    httpOnly: true,
    secure: cookieSeguro,
    sameSite: "lax",
    path: "/",
    expires: Number.isNaN(expires.getTime()) ? undefined : expires,
  });
}

export function apagarSessao(): void {
  cookies().delete(COOKIE_SESSAO);
}
