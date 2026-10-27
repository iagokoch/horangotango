import "server-only";

import { apiRequest } from "@/lib/api/client";

import {
  checklistsEmprestimoSchema,
  emprestimoSchema,
  type ChecklistsEmprestimo,
  type DadosDevolucao,
  type DadosRetirada,
  type Emprestimo,
} from "./types";

const RECURSO = "/loans";

const recurso = (id: string) => `${RECURSO}/${encodeURIComponent(id)}`;

// GET /api/loans/{id} — Staff consulta qualquer empréstimo; Membro só os próprios (403).
// Não existe listagem de empréstimos na API (FR-6/FR-7 são N3).
export function buscarEmprestimo(id: string): Promise<Emprestimo> {
  return apiRequest(recurso(id), emprestimoSchema);
}

export function buscarChecklists(id: string): Promise<ChecklistsEmprestimo> {
  return apiRequest(`${recurso(id)}/checklists`, checklistsEmprestimoSchema);
}

// POST /api/loans — confirmação de retirada pelo Staff (FR-9 a FR-12).
export function registrarRetirada(dados: DadosRetirada): Promise<Emprestimo> {
  return apiRequest(RECURSO, emprestimoSchema, { method: "POST", body: dados });
}

// POST /api/loans/{id}/return — devolução com checklist (FR-13, FR-14, FR-16).
export function registrarDevolucao(id: string, dados: DadosDevolucao): Promise<Emprestimo> {
  return apiRequest(`${recurso(id)}/return`, emprestimoSchema, { method: "POST", body: dados });
}
