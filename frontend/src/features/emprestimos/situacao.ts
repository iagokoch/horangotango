import type { DadosChecklist, Emprestimo } from "./types";

export type Situacao = "EM_DIA" | "VENCE_EM_BREVE" | "ATRASADO" | "DEVOLVIDO" | "PERDA";

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  EM_DIA: "Em dia",
  VENCE_EM_BREVE: "Vence em breve",
  ATRASADO: "Em atraso",
  DEVOLVIDO: "Devolvido",
  PERDA: "Perda registrada",
};

const JANELA_VENCIMENTO_MS = 24 * 60 * 60 * 1000;

// Representação do atraso para exibição. Espelha a definição da API (ACTIVE com prazo
// estritamente anterior ao agora), mas não decide nada: o bloqueio de retirada é sempre do backend.
export function situacaoDoEmprestimo(
  emprestimo: Pick<Emprestimo, "status" | "prazoDevolucao">,
  agora: number = Date.now(),
): Situacao {
  if (emprestimo.status === "RETURNED") return "DEVOLVIDO";
  if (emprestimo.status === "LOST") return "PERDA";
  const prazo = Date.parse(emprestimo.prazoDevolucao);
  if (prazo < agora) return "ATRASADO";
  if (prazo - agora <= JANELA_VENCIMENTO_MS) return "VENCE_EM_BREVE";
  return "EM_DIA";
}

// Fração do prazo já consumida (0 a 1, ou mais quando atrasado). Usada na barra de prazo.
export function progressoDoPrazo(
  emprestimo: Pick<Emprestimo, "dataHoraRetirada" | "prazoDevolucao" | "dataHoraDevolucao">,
  agora: number = Date.now(),
): number {
  const inicio = Date.parse(emprestimo.dataHoraRetirada);
  const fim = Date.parse(emprestimo.prazoDevolucao);
  const referencia = emprestimo.dataHoraDevolucao ? Date.parse(emprestimo.dataHoraDevolucao) : agora;
  if (!(fim > inicio)) return 1;
  return Math.max(0, (referencia - inicio) / (fim - inicio));
}

export interface PendenciaBloqueio {
  emprestimoId: string;
  ferramentaId: string;
  atrasoDesde: string;
}

// O 409 de bloqueio (FR-12) traz em details uma linha por empréstimo atrasado, no formato
// "Empréstimo {id}, ferramenta {id}, em atraso desde {instante}." Linhas fora do formato são
// exibidas como texto, para nunca esconder informação da API.
const PADRAO_PENDENCIA = /^Empréstimo (\S+), ferramenta (\S+), em atraso desde (\S+)\.$/;

export function interpretarBloqueio(detalhes: string[]): {
  pendencias: PendenciaBloqueio[];
  outras: string[];
} {
  const pendencias: PendenciaBloqueio[] = [];
  const outras: string[] = [];
  for (const linha of detalhes) {
    const resultado = PADRAO_PENDENCIA.exec(linha.trim());
    if (resultado) {
      pendencias.push({ emprestimoId: resultado[1], ferramentaId: resultado[2], atrasoDesde: resultado[3] });
    } else {
      outras.push(linha);
    }
  }
  return { pendencias, outras };
}

export function ehBloqueioPorAtraso(erro: { status: number; message: string }): boolean {
  return erro.status === 409 && erro.message.startsWith("Membro bloqueado");
}

export interface Divergencia {
  campo: "estadoFuncional" | "avariasVisiveis" | "acessoriosInclusos";
  descricao: string;
}

const normalizar = (texto: string) => texto.trim().toLowerCase();

// Diferenças entre o checklist da retirada e o da devolução. É informativo: a API da N2 ainda não
// registra divergência (FR-15, N3), então a interface só alerta o Staff antes de confirmar.
export function compararChecklists(
  retirada: DadosChecklist,
  devolucao: DadosChecklist,
): Divergencia[] {
  const divergencias: Divergencia[] = [];
  if (retirada.estadoFuncional !== devolucao.estadoFuncional) {
    divergencias.push({
      campo: "estadoFuncional",
      descricao:
        devolucao.estadoFuncional === "DEFECTIVE"
          ? "Saiu íntegra e volta com defeito."
          : "Saiu com defeito e volta íntegra.",
    });
  }
  if (normalizar(retirada.avariasVisiveis) !== normalizar(devolucao.avariasVisiveis)) {
    divergencias.push({ campo: "avariasVisiveis", descricao: "A descrição das avarias mudou." });
  }
  const acessoriosRetirada = new Set(retirada.acessoriosInclusos.map(normalizar));
  const acessoriosDevolucao = new Set(devolucao.acessoriosInclusos.map(normalizar));
  const faltando = retirada.acessoriosInclusos.filter((item) => !acessoriosDevolucao.has(normalizar(item)));
  const novos = devolucao.acessoriosInclusos.filter((item) => !acessoriosRetirada.has(normalizar(item)));
  if (faltando.length > 0) {
    divergencias.push({ campo: "acessoriosInclusos", descricao: `Não voltou: ${faltando.join(", ")}.` });
  }
  if (novos.length > 0) {
    divergencias.push({ campo: "acessoriosInclusos", descricao: `Item a mais: ${novos.join(", ")}.` });
  }
  return divergencias;
}
