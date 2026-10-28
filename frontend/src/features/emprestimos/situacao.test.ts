import { describe, expect, it } from "vitest";

import {
  compararChecklists,
  ehBloqueioPorAtraso,
  interpretarBloqueio,
  progressoDoPrazo,
  situacaoDoEmprestimo,
} from "./situacao";
import type { DadosChecklist } from "./types";

const AGORA = Date.parse("2026-10-27T12:00:00Z");
const HORA = 60 * 60 * 1000;

describe("situacaoDoEmprestimo", () => {
  it("considera atrasado o empréstimo ativo com prazo anterior ao agora", () => {
    expect(situacaoDoEmprestimo({ status: "ACTIVE", prazoDevolucao: new Date(AGORA - 1).toISOString() }, AGORA)).toBe("ATRASADO");
  });

  it("não marca atraso no instante exato do prazo (estritamente anterior, como na API)", () => {
    expect(situacaoDoEmprestimo({ status: "ACTIVE", prazoDevolucao: new Date(AGORA).toISOString() }, AGORA)).toBe("VENCE_EM_BREVE");
  });

  it("sinaliza vencimento nas próximas 24 horas", () => {
    expect(situacaoDoEmprestimo({ status: "ACTIVE", prazoDevolucao: new Date(AGORA + 5 * HORA).toISOString() }, AGORA)).toBe(
      "VENCE_EM_BREVE",
    );
  });

  it("mantém em dia quando o prazo está distante", () => {
    expect(situacaoDoEmprestimo({ status: "ACTIVE", prazoDevolucao: new Date(AGORA + 72 * HORA).toISOString() }, AGORA)).toBe("EM_DIA");
  });

  it("empréstimo devolvido nunca aparece como atrasado", () => {
    expect(situacaoDoEmprestimo({ status: "RETURNED", prazoDevolucao: "2020-01-01T00:00:00Z" }, AGORA)).toBe("DEVOLVIDO");
    expect(situacaoDoEmprestimo({ status: "LOST", prazoDevolucao: "2020-01-01T00:00:00Z" }, AGORA)).toBe("PERDA");
  });
});

describe("progressoDoPrazo", () => {
  it("calcula a fração consumida do prazo", () => {
    const emprestimo = {
      dataHoraRetirada: new Date(AGORA - 24 * HORA).toISOString(),
      prazoDevolucao: new Date(AGORA + 24 * HORA).toISOString(),
      dataHoraDevolucao: null,
    };
    expect(progressoDoPrazo(emprestimo, AGORA)).toBeCloseTo(0.5);
  });

  it("usa a data de devolução quando o empréstimo foi encerrado", () => {
    const emprestimo = {
      dataHoraRetirada: new Date(AGORA - 10 * HORA).toISOString(),
      prazoDevolucao: new Date(AGORA + 10 * HORA).toISOString(),
      dataHoraDevolucao: new Date(AGORA - 5 * HORA).toISOString(),
    };
    expect(progressoDoPrazo(emprestimo, AGORA)).toBeCloseTo(0.25);
  });
});

describe("interpretarBloqueio", () => {
  it("extrai empréstimo, ferramenta e data das linhas do 409 de inadimplência", () => {
    const { pendencias, outras } = interpretarBloqueio([
      "Empréstimo 7d1f-aa, ferramenta 91c2-bb, em atraso desde 2026-10-20T15:30:12.123456Z.",
      "Empréstimo e3, ferramenta f4, em atraso desde 2026-10-21T08:00:00Z.",
    ]);
    expect(outras).toEqual([]);
    expect(pendencias).toEqual([
      { emprestimoId: "7d1f-aa", ferramentaId: "91c2-bb", atrasoDesde: "2026-10-20T15:30:12.123456Z" },
      { emprestimoId: "e3", ferramentaId: "f4", atrasoDesde: "2026-10-21T08:00:00Z" },
    ]);
  });

  it("preserva linhas fora do formato em vez de descartá-las", () => {
    expect(interpretarBloqueio(["texto livre"]).outras).toEqual(["texto livre"]);
  });

  it("reconhece o 409 de bloqueio pela mensagem da API", () => {
    expect(ehBloqueioPorAtraso({ status: 409, message: "Membro bloqueado por inadimplência. ..." })).toBe(true);
    expect(ehBloqueioPorAtraso({ status: 409, message: "A ferramenta 'X' não está disponível" })).toBe(false);
    expect(ehBloqueioPorAtraso({ status: 422, message: "Membro bloqueado" })).toBe(false);
  });
});

describe("compararChecklists", () => {
  const retirada: DadosChecklist = {
    estadoFuncional: "INTACT",
    avariasVisiveis: "Sem avarias",
    acessoriosInclusos: ["Maleta", "Carregador"],
  };

  it("não aponta diferença para checklists equivalentes (ignora caixa e espaços)", () => {
    expect(
      compararChecklists(retirada, { estadoFuncional: "INTACT", avariasVisiveis: " sem avarias ", acessoriosInclusos: ["carregador", "maleta"] }),
    ).toEqual([]);
  });

  it("aponta defeito novo, mudança de avarias e acessório faltando", () => {
    const divergencias = compararChecklists(retirada, {
      estadoFuncional: "DEFECTIVE",
      avariasVisiveis: "Cabo rachado",
      acessoriosInclusos: ["Maleta"],
    });
    expect(divergencias.map((d) => d.campo)).toEqual(["estadoFuncional", "avariasVisiveis", "acessoriosInclusos"]);
    expect(divergencias[2].descricao).toContain("Carregador");
  });
});
