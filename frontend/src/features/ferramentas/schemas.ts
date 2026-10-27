import { z } from "zod";

import type { DadosCadastroFerramenta, DadosEdicaoFerramenta, Ferramenta } from "./types";

// Limites espelham o Bean Validation de ToolCreateRequest / ToolUpdateRequest.
export const LIMITES_FERRAMENTA = {
  codigo: 18,
  nome: 255,
  categoria: 100,
  estadoConservacao: 1000,
  digitosInteirosValor: 10,
} as const;

// Aceita "1500", "1500,5", "1.500,50" e "1500.50". Retorna null quando o texto não é um valor.
export function converterValorMonetario(texto: string): number | null {
  const limpo = texto.replace(/\s|R\$/g, "");
  if (!limpo) return null;
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const padrao = new RegExp(`^\\d{1,${LIMITES_FERRAMENTA.digitosInteirosValor}}(\\.\\d{1,2})?$`);
  if (!padrao.test(normalizado)) return null;
  return Number(normalizado);
}

export function valorParaTexto(valor: number): string {
  return valor.toFixed(2).replace(".", ",");
}

const textoObrigatorio = (campo: string, maximo: number) =>
  z
    .string()
    .trim()
    .min(1, `Informe ${campo}.`)
    .max(maximo, `Use no máximo ${maximo} caracteres.`);

// O formulário trabalha com texto (valor dos inputs); a saída já vem no formato da API.
export const formularioFerramentaSchema = z.object({
  codigo: textoObrigatorio("o código", LIMITES_FERRAMENTA.codigo),
  nome: textoObrigatorio("o nome", LIMITES_FERRAMENTA.nome),
  categoria: textoObrigatorio("a categoria", LIMITES_FERRAMENTA.categoria),
  valorEstimado: z
    .string()
    .trim()
    .min(1, "Informe o valor estimado.")
    .transform((texto, ctx) => {
      const valor = converterValorMonetario(texto);
      if (valor === null) {
        ctx.addIssue({
          code: "custom",
          message: "Use até 10 dígitos e 2 casas decimais, por exemplo 1.250,00.",
        });
        return z.NEVER;
      }
      if (valor <= 0) {
        ctx.addIssue({ code: "custom", message: "O valor deve ser maior que zero." });
        return z.NEVER;
      }
      return valor;
    }),
  estadoConservacao: textoObrigatorio("o estado de conservação", LIMITES_FERRAMENTA.estadoConservacao),
});

export type ValoresFormularioFerramenta = z.input<typeof formularioFerramentaSchema>;
export type DadosFormularioFerramenta = z.output<typeof formularioFerramentaSchema>;

export const CAMPOS_FERRAMENTA = ["codigo", "nome", "categoria", "valorEstimado", "estadoConservacao"] as const;

export function valoresIniciaisDe(ferramenta: Ferramenta): ValoresFormularioFerramenta {
  return {
    codigo: ferramenta.codigo,
    nome: ferramenta.nome,
    categoria: ferramenta.categoria,
    valorEstimado: valorParaTexto(ferramenta.valorEstimado),
    estadoConservacao: ferramenta.estadoConservacao,
  };
}

// PATCH parcial: envia só o que mudou, além da versão lida (optimistic lock). Assim a edição de um
// campo não sobrescreve outro alterado por outra pessoa no intervalo.
export function montarEdicao(
  original: Ferramenta,
  dados: DadosCadastroFerramenta,
): DadosEdicaoFerramenta {
  const edicao: DadosEdicaoFerramenta = { versao: original.versao };
  for (const campo of CAMPOS_FERRAMENTA) {
    if (campo === "valorEstimado") {
      if (dados.valorEstimado !== original.valorEstimado) edicao.valorEstimado = dados.valorEstimado;
    } else if (dados[campo] !== original[campo]) {
      edicao[campo] = dados[campo];
    }
  }
  return edicao;
}
