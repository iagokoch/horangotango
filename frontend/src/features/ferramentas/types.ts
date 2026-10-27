import { z } from "zod";

export const STATUS_FERRAMENTA = ["AVAILABLE", "ON_LOAN", "UNDER_REPAIR", "LOST", "INACTIVE"] as const;
export const statusFerramentaSchema = z.enum(STATUS_FERRAMENTA);
export type StatusFerramenta = z.infer<typeof statusFerramentaSchema>;

// ToolResponse. valorEstimado é BigDecimal no backend e chega como número JSON.
export const ferramentaSchema = z.object({
  id: z.string(),
  codigo: z.string(),
  nome: z.string(),
  categoria: z.string(),
  valorEstimado: z.coerce.number(),
  estadoConservacao: z.string(),
  status: statusFerramentaSchema,
  idUsuarioCriacao: z.string().nullish(),
  dataHoraCriacao: z.string().nullish(),
  idUsuarioAlteracao: z.string().nullish(),
  dataHoraAlteracao: z.string().nullish(),
  versao: z.number().int(),
});
export type Ferramenta = z.infer<typeof ferramentaSchema>;

export const listaFerramentasSchema = z.array(ferramentaSchema);

// ToolCreateRequest (POST). Toda ferramenta nasce AVAILABLE: o corpo não aceita status.
export interface DadosCadastroFerramenta {
  codigo: string;
  nome: string;
  categoria: string;
  valorEstimado: number;
  estadoConservacao: string;
}

// ToolUpdateRequest (PATCH): só versao é obrigatória; campos omitidos não mudam.
export type DadosEdicaoFerramenta = Partial<DadosCadastroFerramenta> & {
  status?: Extract<StatusFerramenta, "AVAILABLE" | "INACTIVE">;
  versao: number;
};
