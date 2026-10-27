// Índice local dos empréstimos acompanhados neste navegador.
//
// A API da N2 não lista empréstimos (FR-6 e FR-7 estão reservados para a N3), só os consulta por
// ID. Para o balcão não depender de anotar IDs, guardamos aqui apenas os identificadores dos
// empréstimos registrados ou abertos neste dispositivo, separados por usuário. Os dados exibidos
// são sempre lidos da API no momento; nada do estado do empréstimo é persistido localmente.

const PREFIXO = "monitoolring:emprestimos:";
const LIMITE = 30;
export const EVENTO_ACOMPANHAMENTO = "monitoolring:acompanhamento";

export interface RegistroAcompanhado {
  id: string;
  adicionadoEm: string;
}

function chave(usuarioId: string) {
  return `${PREFIXO}${usuarioId}`;
}

function armazenamento(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function lerAcompanhados(usuarioId: string): RegistroAcompanhado[] {
  const storage = armazenamento();
  if (!storage) return [];
  try {
    const bruto = JSON.parse(storage.getItem(chave(usuarioId)) ?? "[]");
    if (!Array.isArray(bruto)) return [];
    return bruto.filter(
      (item): item is RegistroAcompanhado =>
        typeof item?.id === "string" && typeof item?.adicionadoEm === "string",
    );
  } catch {
    return [];
  }
}

function gravar(usuarioId: string, registros: RegistroAcompanhado[]) {
  const storage = armazenamento();
  if (!storage) return;
  try {
    storage.setItem(chave(usuarioId), JSON.stringify(registros.slice(0, LIMITE)));
    window.dispatchEvent(new Event(EVENTO_ACOMPANHAMENTO));
  } catch {
    // Armazenamento cheio ou bloqueado: o acompanhamento é uma conveniência, não um requisito.
  }
}

export function acompanhar(usuarioId: string, emprestimoId: string) {
  const atuais = lerAcompanhados(usuarioId).filter((item) => item.id !== emprestimoId);
  gravar(usuarioId, [{ id: emprestimoId, adicionadoEm: new Date().toISOString() }, ...atuais]);
}

export function deixarDeAcompanhar(usuarioId: string, emprestimoId: string) {
  gravar(
    usuarioId,
    lerAcompanhados(usuarioId).filter((item) => item.id !== emprestimoId),
  );
}
