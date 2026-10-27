import { NextResponse, type NextRequest } from "next/server";

import { COOKIE_SESSAO, decodificarSessao, sessaoExpirada } from "@/lib/auth/session-codec";
import { PADROES_STAFF, ROTAS, ROTAS_PUBLICAS } from "@/lib/rotas";

// Primeira barreira de navegação: redireciona sem sessão, com sessão vencida e por papel.
// É conveniência de experiência; a autorização real é do backend (401/403) e as páginas
// repetem a checagem no servidor.
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const valor = request.cookies.get(COOKIE_SESSAO)?.value;
  const sessao = decodificarSessao(valor);
  const valida = sessao !== null && !sessaoExpirada(sessao);
  const publica = ROTAS_PUBLICAS.some((rota) => pathname === rota);

  if (publica) {
    return valida ? NextResponse.redirect(new URL(ROTAS.painel, request.url)) : NextResponse.next();
  }

  if (!valida) {
    const login = new URL(ROTAS.login, request.url);
    if (pathname !== ROTAS.inicio) {
      login.searchParams.set("next", `${pathname}${search}`);
    }
    if (valor) {
      login.searchParams.set("motivo", "expirada");
    }
    const resposta = NextResponse.redirect(login);
    if (valor) {
      resposta.cookies.delete(COOKIE_SESSAO);
    }
    return resposta;
  }

  if (sessao.usuario.papel !== "STAFF" && PADROES_STAFF.some((padrao) => padrao.test(pathname))) {
    return NextResponse.redirect(new URL(ROTAS.acessoNegado, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Tudo, exceto assets do Next, arquivos estáticos e o route handler que encerra a sessão.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|sessao/expirada|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
