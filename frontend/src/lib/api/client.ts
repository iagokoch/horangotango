import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { z } from "zod";

import { obterToken } from "@/lib/auth/session";
import { apiBaseUrl } from "@/lib/env";

import { ApiError, NETWORK_ERROR_STATUS } from "./errors";

const TIMEOUT_MS = 10_000;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  // Login e cadastro são públicos: não enviam o token mesmo que exista uma sessão antiga.
  publico?: boolean;
}

// ErrorResponse {timestamp, status, error, message, details} do GlobalExceptionHandler.
const errorResponseSchema = z.object({
  message: z.string(),
  details: z.array(z.string()).nullish(),
});

// Toda resposta é validada pelo schema da feature: uma divergência de contrato vira erro
// explícito em vez de dado parcial na tela.
export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const resposta = await apiRequestRaw(path, options);
  return schema.parse(resposta);
}

export async function apiRequestRaw(path: string, options: RequestOptions = {}): Promise<unknown> {
  // Dados operacionais (disponibilidade, prazos) nunca vêm de cache (FR-5). Fica fora do
  // try/catch de send() porque, na pré-renderização, o Next sinaliza a rota como dinâmica
  // lançando um erro próprio que não pode ser confundido com falha de rede.
  noStore();
  const response = await send(path, options);
  if (!response.ok) {
    throw await toApiError(response);
  }
  if (response.status === 204) {
    return null;
  }
  const texto = await response.text();
  return texto ? JSON.parse(texto) : null;
}

async function send(path: string, { method = "GET", body, publico }: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (!publico) {
    const token = obterToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  try {
    return await fetch(`${apiBaseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    // Só o método e a rota vão para o log: nunca cabeçalhos ou corpo (token e senha).
    console.error(`[api] ${method} ${path} falhou sem resposta HTTP:`, (error as Error).name);
    throw new ApiError(NETWORK_ERROR_STATUS, "Não foi possível conectar ao servidor da API.");
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  // Corpo vazio ou não JSON (ex.: proxy) não é falha da leitura: cai na mensagem genérica.
  const body: unknown = await response.json().catch(() => null);
  const parsed = errorResponseSchema.safeParse(body);
  if (!parsed.success) {
    return new ApiError(response.status, mensagemPadrao(response.status));
  }
  return new ApiError(response.status, parsed.data.message, parsed.data.details ?? []);
}

function mensagemPadrao(status: number): string {
  if (status === 401) return "Sessão ausente ou expirada.";
  if (status === 403) return "Seu perfil não tem permissão para esta operação.";
  if (status === 404) return "Recurso não encontrado.";
  if (status >= 500) return "O servidor não conseguiu processar a solicitação.";
  return "A solicitação não pôde ser concluída.";
}
