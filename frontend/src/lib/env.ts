import "server-only";

const PADRAO_DESENVOLVIMENTO = "http://localhost:8080/api";

// Todas as chamadas à API partem do servidor Next (o navegador nunca vê o token JWT), então a URL
// é lida em tempo de execução. API_URL tem prioridade porque, em containers, o servidor alcança o
// backend por um host interno; NEXT_PUBLIC_API_URL é mantida por compatibilidade com o frontend N1.
export function apiBaseUrl(): string {
  const configurada = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (configurada) {
    return configurada.replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Configure API_URL com o endereço da API (ex.: http://localhost:8080/api).");
  }
  return PADRAO_DESENVOLVIMENTO;
}

export const cookieSeguro = process.env.NODE_ENV === "production" && process.env.COOKIE_INSECURE !== "true";
