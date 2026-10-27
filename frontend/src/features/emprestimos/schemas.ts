import type { DefaultValues } from "react-hook-form";
import { z } from "zod";

// Limites de ChecklistRequest. A obrigatoriedade dos campos é regra do FR-10/FR-14 (422 na API);
// o formulário a antecipa para o Staff não perder a confirmação no balcão.
export const LIMITES_CHECKLIST = {
  avarias: 2000,
  acessorios: 50,
  acessorio: 255,
} as const;

export const SEM_AVARIAS = "Sem avarias";
export const NENHUM_ACESSORIO = "Nenhum";

export const checklistFormSchema = z.object({
  estadoFuncional: z.enum(["INTACT", "DEFECTIVE"], { error: "Indique o estado funcional." }),
  avariasVisiveis: z
    .string()
    .trim()
    .min(1, `Descreva as avarias ou escreva "${SEM_AVARIAS}".`)
    .max(LIMITES_CHECKLIST.avarias, `Use no máximo ${LIMITES_CHECKLIST.avarias} caracteres.`),
  acessoriosInclusos: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(LIMITES_CHECKLIST.acessorio, `Cada acessório pode ter até ${LIMITES_CHECKLIST.acessorio} caracteres.`),
    )
    .min(1, `Liste os acessórios ou marque "${NENHUM_ACESSORIO}".`)
    .max(LIMITES_CHECKLIST.acessorios, `Liste no máximo ${LIMITES_CHECKLIST.acessorios} acessórios.`),
});

export type ValoresChecklist = z.input<typeof checklistFormSchema>;

export const retiradaFormSchema = z.object({
  ferramentaId: z.string().min(1, "Selecione a ferramenta."),
  membroId: z.string().trim().min(1, "Informe o ID do membro."),
  checklist: checklistFormSchema,
});

export type ValoresRetirada = z.input<typeof retiradaFormSchema>;

export const devolucaoFormSchema = z.object({
  checklist: checklistFormSchema,
});

export type ValoresDevolucao = z.input<typeof devolucaoFormSchema>;

export const CHECKLIST_VAZIO: DefaultValues<ValoresChecklist> = {
  estadoFuncional: undefined,
  avariasVisiveis: "",
  acessoriosInclusos: [],
};
