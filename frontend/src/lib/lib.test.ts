import { describe, expect, it } from "vitest";

import { bytesUtf8, cadastroSchema, contaSchema, destinoSeguro } from "@/features/auth/schemas";
import { checklistFormSchema, retiradaFormSchema } from "@/features/emprestimos/schemas";

import { descreverErro, errosDeCampo } from "./api/mensagens";
import { codificarSessao, decodificarSessao, sessaoExpirada } from "./auth/session-codec";
import type { Sessao } from "./auth/types";
import { formatarDistancia } from "./format";
import { PADROES_STAFF } from "./rotas";
import { normalizarBusca } from "./utils";

const sessao: Sessao = {
  token: "eyJhbGciOiJIUzI1NiJ9.payload.assinatura",
  expiraEm: "2026-10-27T20:00:00Z",
  usuario: { id: "u-1", nome: "João Conceição", email: "joao@oficina.dev", papel: "STAFF" },
};

describe("cookie de sessão", () => {
  it("codifica e decodifica preservando acentos", () => {
    expect(decodificarSessao(codificarSessao(sessao))).toEqual(sessao);
  });

  it("trata valor adulterado ou ausente como sem sessão", () => {
    expect(decodificarSessao(undefined)).toBeNull();
    expect(decodificarSessao("não-é-base64")).toBeNull();
    expect(decodificarSessao(codificarSessao({ ...sessao, usuario: { ...sessao.usuario, papel: "ADMIN" as never } }))).toBeNull();
  });

  it("considera expirada a sessão no limite da validade", () => {
    const expira = Date.parse(sessao.expiraEm);
    expect(sessaoExpirada(sessao, expira - 60_000)).toBe(false);
    expect(sessaoExpirada(sessao, expira - 10_000)).toBe(true);
    expect(sessaoExpirada({ ...sessao, expiraEm: "inválida" })).toBe(true);
  });
});

describe("destinoSeguro", () => {
  it("aceita só caminhos internos (evita open redirect após o login)", () => {
    expect(destinoSeguro("/ferramentas?status=AVAILABLE", "/painel")).toBe("/ferramentas?status=AVAILABLE");
    expect(destinoSeguro("https://malicioso.example", "/painel")).toBe("/painel");
    expect(destinoSeguro("//malicioso.example", "/painel")).toBe("/painel");
    expect(destinoSeguro("/\\malicioso.example", "/painel")).toBe("/painel");
    expect(destinoSeguro(undefined, "/painel")).toBe("/painel");
  });
});

describe("validação de conta", () => {
  it("conta a senha em bytes UTF-8, como o limite de 72 bytes do BCrypt", () => {
    expect(bytesUtf8("ação")).toBe(6);
    expect(contaSchema.safeParse({ nome: "A", email: "a@b.co", senha: "é".repeat(36) }).success).toBe(true);
    expect(contaSchema.safeParse({ nome: "A", email: "a@b.co", senha: "é".repeat(37) }).success).toBe(false);
  });

  it("exige no mínimo 8 caracteres e confirmação igual", () => {
    expect(contaSchema.safeParse({ nome: "A", email: "a@b.co", senha: "1234567" }).success).toBe(false);
    expect(cadastroSchema.safeParse({ nome: "A", email: "a@b.co", senha: "12345678", confirmacao: "12345679" }).success).toBe(false);
  });
});

describe("validação do checklist", () => {
  it("exige estado, avarias e acessórios explícitos", () => {
    expect(checklistFormSchema.safeParse({ estadoFuncional: "INTACT", avariasVisiveis: "Sem avarias", acessoriosInclusos: ["Nenhum"] }).success).toBe(true);
    expect(checklistFormSchema.safeParse({ estadoFuncional: undefined, avariasVisiveis: "x", acessoriosInclusos: ["y"] }).success).toBe(false);
    expect(checklistFormSchema.safeParse({ estadoFuncional: "INTACT", avariasVisiveis: "  ", acessoriosInclusos: ["y"] }).success).toBe(false);
    expect(checklistFormSchema.safeParse({ estadoFuncional: "INTACT", avariasVisiveis: "x", acessoriosInclusos: [] }).success).toBe(false);
  });

  it("não valida bloqueio por atraso: essa regra é exclusiva da API", () => {
    const resultado = retiradaFormSchema.safeParse({
      ferramentaId: "f",
      membroId: " m ",
      checklist: { estadoFuncional: "DEFECTIVE", avariasVisiveis: "Risco", acessoriosInclusos: ["Maleta"] },
    });
    expect(resultado.success && resultado.data.membroId).toBe("m");
  });
});

describe("mensagens de erro", () => {
  it("associa detalhes 'campo: mensagem' aos campos do formulário", () => {
    expect(errosDeCampo(["codigo: codigo deve ter no máximo 18 caracteres", "outro: x", "sem separador"], ["codigo", "nome"] as const)).toEqual([
      { campo: "codigo", mensagem: "Codigo deve ter no máximo 18 caracteres" },
    ]);
  });

  it("usa a mensagem da API em conflitos e uma orientação para falha de rede", () => {
    expect(descreverErro({ status: 409, message: "Já existe" }, "Título").motivo).toBe("Já existe");
    expect(descreverErro({ status: 0, message: "" }, "Título").orientacao).toContain("backend");
    expect(descreverErro({ status: 500, message: "stack interna" }, "Título").motivo).not.toContain("stack");
  });
});

describe("rotas exclusivas de Staff", () => {
  const exclusiva = (rota: string) => PADROES_STAFF.some((padrao) => padrao.test(rota));

  it("cobre as telas de operação e administração", () => {
    expect(exclusiva("/ferramentas/nova")).toBe(true);
    expect(exclusiva("/ferramentas/abc/editar")).toBe(true);
    expect(exclusiva("/emprestimos/nova")).toBe(true);
    expect(exclusiva("/emprestimos/abc/devolucao")).toBe(true);
    expect(exclusiva("/configuracoes")).toBe(true);
  });

  it("libera as consultas permitidas a membros", () => {
    expect(exclusiva("/ferramentas")).toBe(false);
    expect(exclusiva("/ferramentas/abc")).toBe(false);
    expect(exclusiva("/emprestimos/abc")).toBe(false);
    expect(exclusiva("/painel")).toBe(false);
  });
});

describe("utilitários", () => {
  it("busca sem acentos nem caixa", () => {
    expect(normalizarBusca("  Furadeira ELÉTRICA ")).toBe("furadeira eletrica");
  });

  it("descreve distância de prazos em linguagem de balcão", () => {
    const agora = Date.parse("2026-10-27T12:00:00Z");
    expect(formatarDistancia("2026-10-30T12:00:00Z", agora)).toBe("em 3 dias");
    expect(formatarDistancia("2026-10-27T10:00:00Z", agora)).toBe("há 2 h");
  });
});
