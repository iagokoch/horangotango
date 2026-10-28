import "server-only";

import { z } from "zod";

import type { DadosConta } from "@/features/auth/schemas";
import { apiRequest } from "@/lib/api/client";
import { usuarioSchema, type Usuario } from "@/lib/auth/types";

export const prazoSchema = z.object({
  dias: z.number().int(),
  idUsuarioAlteracao: z.string().nullish(),
  dataHoraAlteracao: z.string().nullish(),
});
export type PrazoDevolucao = z.infer<typeof prazoSchema>;

const RECURSO_PRAZO = "/settings/return-deadline";

// GET — exclusivo de Staff; 404 enquanto nenhum prazo foi configurado (retiradas ficam bloqueadas).
export function buscarPrazo(): Promise<PrazoDevolucao> {
  return apiRequest(RECURSO_PRAZO, prazoSchema);
}

// PUT — dias corridos entre 1 e 365; vale só para retiradas novas (FR-8).
export function definirPrazo(dias: number): Promise<PrazoDevolucao> {
  return apiRequest(RECURSO_PRAZO, prazoSchema, { method: "PUT", body: { dias } });
}

// POST /api/staff — Staff cria outra conta Staff (FR-2). O papel é decidido pela rota.
export function cadastrarStaff(dados: DadosConta): Promise<Usuario> {
  return apiRequest("/staff", usuarioSchema, { method: "POST", body: dados });
}
