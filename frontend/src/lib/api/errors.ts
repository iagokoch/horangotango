// Tipos de erro compartilhados entre servidor e cliente. Não importa nada exclusivo do servidor,
// porque componentes de cliente recebem ActionError como dado.

// Status usado quando não houve resposta HTTP (rede indisponível ou timeout).
export const NETWORK_ERROR_STATUS = 0;

export interface ActionError {
  status: number;
  message: string;
  details: string[];
}

// Server Actions devolvem erro esperado como dado, não como exceção: exceções lançadas numa
// Server Action chegam ao cliente sem a mensagem original em produção.
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

export class ApiError extends Error {
  readonly status: number;
  readonly details: string[];

  constructor(status: number, message: string, details: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }

  toActionError(): ActionError {
    return { status: this.status, message: this.message, details: this.details };
  }
}

export function falha(status: number, message: string, details: string[] = []): ActionResult<never> {
  return { ok: false, error: { status, message, details } };
}
