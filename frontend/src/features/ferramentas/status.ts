import type { Ferramenta, StatusFerramenta } from "./types";

export interface MetaStatus {
  rotulo: string;
  rotuloPlural: string;
  descricao: string;
}

// Vocabulário do PRD (Glossário). A ordem define a ordem dos filtros e das legendas.
export const META_STATUS: Record<StatusFerramenta, MetaStatus> = {
  AVAILABLE: {
    rotulo: "Disponível",
    rotuloPlural: "Disponíveis",
    descricao: "Pode ser retirada no balcão.",
  },
  ON_LOAN: {
    rotulo: "Emprestada",
    rotuloPlural: "Emprestadas",
    descricao: "Vinculada a um empréstimo ativo.",
  },
  UNDER_REPAIR: {
    rotulo: "Em reparo",
    rotuloPlural: "Em reparo",
    descricao: "Fora de circulação para reparo ou inspeção.",
  },
  LOST: {
    rotulo: "Perdida",
    rotuloPlural: "Perdidas",
    descricao: "Perda ou furto registrado.",
  },
  INACTIVE: {
    rotulo: "Inativa",
    rotuloPlural: "Inativas",
    descricao: "Fora de circulação por decisão do Staff. O registro é mantido.",
  },
};

export type AcaoCicloVida = "INATIVAR" | "REATIVAR";

// Transições manuais aceitas pelo PATCH (ToolStatus.isManuallyAssignable): só AVAILABLE e
// INACTIVE podem ser pedidos, e uma ferramenta ON_LOAN não muda de status (409). A interface
// oferece apenas as transições que a API aceita; a decisão final continua sendo do backend.
export function acoesCicloVida(status: StatusFerramenta): AcaoCicloVida[] {
  switch (status) {
    case "AVAILABLE":
      return ["INATIVAR"];
    case "INACTIVE":
      return ["REATIVAR"];
    case "UNDER_REPAIR":
    case "LOST":
      return ["REATIVAR", "INATIVAR"];
    case "ON_LOAN":
      return [];
  }
}

export function statusDestino(acao: AcaoCicloVida): "AVAILABLE" | "INACTIVE" {
  return acao === "INATIVAR" ? "INACTIVE" : "AVAILABLE";
}

export function contarPorStatus(ferramentas: Ferramenta[]): Record<StatusFerramenta, number> {
  const contagem: Record<StatusFerramenta, number> = {
    AVAILABLE: 0,
    ON_LOAN: 0,
    UNDER_REPAIR: 0,
    LOST: 0,
    INACTIVE: 0,
  };
  for (const ferramenta of ferramentas) {
    contagem[ferramenta.status] += 1;
  }
  return contagem;
}

export interface ResumoCategoria {
  categoria: string;
  total: number;
  porStatus: Record<StatusFerramenta, number>;
}

export function resumirPorCategoria(ferramentas: Ferramenta[]): ResumoCategoria[] {
  const grupos = new Map<string, Ferramenta[]>();
  for (const ferramenta of ferramentas) {
    const lista = grupos.get(ferramenta.categoria) ?? [];
    lista.push(ferramenta);
    grupos.set(ferramenta.categoria, lista);
  }
  return Array.from(grupos, ([categoria, itens]) => ({
    categoria,
    total: itens.length,
    porStatus: contarPorStatus(itens),
  })).sort((a, b) => b.total - a.total || a.categoria.localeCompare(b.categoria, "pt-BR"));
}
