import { NextResponse, type NextRequest } from "next/server";

import { COOKIE_SESSAO } from "@/lib/auth/session-codec";
import { ROTAS } from "@/lib/rotas";

// Server Components não podem apagar cookies. Quando a API responde 401 durante uma renderização
// (token vencido ou recusado), a página redireciona para cá, e este handler descarta a sessão.
export function GET(request: NextRequest) {
  const destino = new URL(ROTAS.login, request.url);
  destino.searchParams.set("motivo", "expirada");
  const resposta = NextResponse.redirect(destino);
  resposta.cookies.delete(COOKIE_SESSAO);
  return resposta;
}
