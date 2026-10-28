import { sessaoSchema, type Sessao } from "./types";

// Codificação do cookie de sessão. Fica separada de session.ts porque o middleware roda no Edge
// Runtime e não pode importar módulos "server-only" que dependem de next/headers.

export const COOKIE_SESSAO = "mt_session";

function paraBase64Url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = "";
  bytes.forEach((byte) => {
    binario += String.fromCharCode(byte);
  });
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(valor: string): string {
  const base64 = valor.replace(/-/g, "+").replace(/_/g, "/");
  const binario = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  const bytes = Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function codificarSessao(sessao: Sessao): string {
  return paraBase64Url(JSON.stringify(sessao));
}

// Cookie adulterado ou de formato antigo é tratado como ausência de sessão.
export function decodificarSessao(valor: string | undefined): Sessao | null {
  if (!valor) {
    return null;
  }
  try {
    const resultado = sessaoSchema.safeParse(JSON.parse(deBase64Url(valor)));
    return resultado.success ? resultado.data : null;
  } catch {
    return null;
  }
}

// A validade real do token é decidida pelo backend; aqui só evitamos usar um token sabidamente
// vencido. A margem cobre pequenas diferenças de relógio entre servidor Next e API.
const MARGEM_EXPIRACAO_MS = 30_000;

export function sessaoExpirada(sessao: Sessao, agora: number = Date.now()): boolean {
  const expiraEm = Date.parse(sessao.expiraEm);
  return Number.isNaN(expiraEm) || expiraEm - MARGEM_EXPIRACAO_MS <= agora;
}
