import { describe, expect, it } from "vitest";

import { converterValorMonetario, formularioFerramentaSchema, montarEdicao } from "./schemas";
import { acoesCicloVida, contarPorStatus, resumirPorCategoria, statusDestino } from "./status";
import type { Ferramenta } from "./types";

function ferramenta(parcial: Partial<Ferramenta>): Ferramenta {
  return {
    id: "id-1",
    codigo: "FUR-01",
    nome: "Furadeira de impacto",
    categoria: "Elétricas",
    valorEstimado: 450,
    estadoConservacao: "Bom",
    status: "AVAILABLE",
    versao: 3,
    ...parcial,
  };
}

describe("converterValorMonetario", () => {
  it.each([
    ["1500", 1500],
    ["1500,5", 1500.5],
    ["1.500,50", 1500.5],
    ["1500.50", 1500.5],
    ["R$ 12,00", 12],
  ])("aceita %s", (entrada, esperado) => {
    expect(converterValorMonetario(entrada)).toBe(esperado);
  });

  it.each(["", "abc", "1,234", "12345678901", "-5"])("recusa %s", (entrada) => {
    expect(converterValorMonetario(entrada)).toBeNull();
  });
});

describe("formularioFerramentaSchema", () => {
  const valido = { codigo: "SER-02", nome: "Serra tico-tico", categoria: "Elétricas", valorEstimado: "320,00", estadoConservacao: "Novo" };

  it("converte o valor para número no formato da API", () => {
    expect(formularioFerramentaSchema.parse(valido).valorEstimado).toBe(320);
  });

  it("recusa valor zero e código acima de 18 caracteres, como o Bean Validation", () => {
    expect(formularioFerramentaSchema.safeParse({ ...valido, valorEstimado: "0" }).success).toBe(false);
    expect(formularioFerramentaSchema.safeParse({ ...valido, codigo: "X".repeat(19) }).success).toBe(false);
  });

  it("recusa campos só com espaços", () => {
    expect(formularioFerramentaSchema.safeParse({ ...valido, nome: "   " }).success).toBe(false);
  });
});

describe("montarEdicao", () => {
  it("envia apenas os campos alterados, sempre com a versão lida", () => {
    const original = ferramenta({});
    const edicao = montarEdicao(original, {
      codigo: "FUR-01",
      nome: "Furadeira de impacto",
      categoria: "Elétricas",
      valorEstimado: 500,
      estadoConservacao: "Bom",
    });
    expect(edicao).toEqual({ versao: 3, valorEstimado: 500 });
  });
});

describe("ciclo de vida", () => {
  it("oferece só as transições aceitas pelo PATCH", () => {
    expect(acoesCicloVida("AVAILABLE")).toEqual(["INATIVAR"]);
    expect(acoesCicloVida("INACTIVE")).toEqual(["REATIVAR"]);
    expect(acoesCicloVida("UNDER_REPAIR")).toEqual(["REATIVAR", "INATIVAR"]);
    expect(acoesCicloVida("LOST")).toEqual(["REATIVAR", "INATIVAR"]);
    // Ferramenta emprestada não muda de status (a API responde 409).
    expect(acoesCicloVida("ON_LOAN")).toEqual([]);
  });

  it("inativar envia INACTIVE e reativar envia AVAILABLE; nunca há exclusão", () => {
    expect(statusDestino("INATIVAR")).toBe("INACTIVE");
    expect(statusDestino("REATIVAR")).toBe("AVAILABLE");
  });
});

describe("métricas do acervo", () => {
  const acervo = [
    ferramenta({ id: "1", status: "AVAILABLE", categoria: "Elétricas" }),
    ferramenta({ id: "2", status: "ON_LOAN", categoria: "Elétricas" }),
    ferramenta({ id: "3", status: "INACTIVE", categoria: "Manuais" }),
  ];

  it("conta ferramentas por status", () => {
    expect(contarPorStatus(acervo)).toEqual({ AVAILABLE: 1, ON_LOAN: 1, UNDER_REPAIR: 0, LOST: 0, INACTIVE: 1 });
  });

  it("agrupa por categoria, da maior para a menor", () => {
    const resumo = resumirPorCategoria(acervo);
    expect(resumo.map((r) => [r.categoria, r.total])).toEqual([
      ["Elétricas", 2],
      ["Manuais", 1],
    ]);
    expect(resumo[0].porStatus.ON_LOAN).toBe(1);
  });
});
