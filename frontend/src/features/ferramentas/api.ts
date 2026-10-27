import "server-only";

import { apiRequest } from "@/lib/api/client";

import {
  ferramentaSchema,
  listaFerramentasSchema,
  type DadosCadastroFerramenta,
  type DadosEdicaoFerramenta,
  type Ferramenta,
  type StatusFerramenta,
} from "./types";

const RECURSO = "/tools";

const recurso = (id: string) => `${RECURSO}/${encodeURIComponent(id)}`;

// GET /api/tools — catálogo ordenado por código, com filtro opcional de status (FR-5).
export function listarFerramentas(status?: StatusFerramenta): Promise<Ferramenta[]> {
  const query = status ? `?status=${status}` : "";
  return apiRequest(`${RECURSO}${query}`, listaFerramentasSchema);
}

export function buscarFerramenta(id: string): Promise<Ferramenta> {
  return apiRequest(recurso(id), ferramentaSchema);
}

// POST /api/tools — exclusivo de Staff (FR-3).
export function cadastrarFerramenta(dados: DadosCadastroFerramenta): Promise<Ferramenta> {
  return apiRequest(RECURSO, ferramentaSchema, { method: "POST", body: dados });
}

// PATCH /api/tools/{id} — edição parcial, inativação e reativação (FR-4). Não existe DELETE.
export function editarFerramenta(id: string, dados: DadosEdicaoFerramenta): Promise<Ferramenta> {
  return apiRequest(recurso(id), ferramentaSchema, { method: "PATCH", body: dados });
}
