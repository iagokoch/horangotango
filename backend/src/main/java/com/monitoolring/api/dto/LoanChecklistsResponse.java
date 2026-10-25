package com.monitoolring.api.dto;

/** Checklists do mesmo empréstimo; checklistDevolucao é nulo enquanto não houver devolução. */
public record LoanChecklistsResponse(
        String emprestimoId,
        ChecklistResponse checklistRetirada,
        ChecklistResponse checklistDevolucao
) {
}
