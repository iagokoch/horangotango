import { z } from "zod";

export const estadoFuncionalSchema = z.enum(["INTACT", "DEFECTIVE"]);
export type EstadoFuncional = z.infer<typeof estadoFuncionalSchema>;

export const statusEmprestimoSchema = z.enum(["ACTIVE", "RETURNED", "LOST"]);
export type StatusEmprestimo = z.infer<typeof statusEmprestimoSchema>;

// ChecklistResponse: registro imutável feito na retirada (CHECKOUT) ou na devolução (RETURN).
export const checklistSchema = z.object({
  id: z.string(),
  tipo: z.enum(["CHECKOUT", "RETURN"]),
  estadoFuncional: estadoFuncionalSchema,
  avariasVisiveis: z.string(),
  acessoriosInclusos: z.array(z.string()),
  idUsuarioRegistro: z.string().nullish(),
  dataHoraRegistro: z.string(),
});
export type Checklist = z.infer<typeof checklistSchema>;

// LoanResponse. A API só devolve identificadores de ferramenta, membro e staff.
export const emprestimoSchema = z.object({
  id: z.string(),
  ferramentaId: z.string(),
  membroId: z.string(),
  staffRetiradaId: z.string().nullish(),
  dataHoraRetirada: z.string(),
  diasPrazo: z.number().int(),
  prazoDevolucao: z.string(),
  status: statusEmprestimoSchema,
  checklistRetirada: checklistSchema.nullish(),
  dataHoraDevolucao: z.string().nullish(),
  staffDevolucaoId: z.string().nullish(),
  checklistDevolucao: checklistSchema.nullish(),
});
export type Emprestimo = z.infer<typeof emprestimoSchema>;

export const checklistsEmprestimoSchema = z.object({
  emprestimoId: z.string(),
  checklistRetirada: checklistSchema.nullish(),
  checklistDevolucao: checklistSchema.nullish(),
});
export type ChecklistsEmprestimo = z.infer<typeof checklistsEmprestimoSchema>;

// ChecklistRequest.
export interface DadosChecklist {
  estadoFuncional: EstadoFuncional;
  avariasVisiveis: string;
  acessoriosInclusos: string[];
}

// LoanCreateRequest (POST /loans) e LoanReturnRequest (POST /loans/{id}/return).
export interface DadosRetirada {
  ferramentaId: string;
  membroId: string;
  checklist: DadosChecklist;
}

export interface DadosDevolucao {
  checklist: DadosChecklist;
}

export const ROTULO_ESTADO_FUNCIONAL: Record<EstadoFuncional, string> = {
  INTACT: "Íntegra",
  DEFECTIVE: "Com defeito",
};
