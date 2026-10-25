package com.monitoolring.api.dto;

import jakarta.validation.Valid;

/** Confirmação de Devolução pelo Staff; checklist ausente ou incompleto recebe 422 (FR-14). */
public record LoanReturnRequest(@Valid ChecklistRequest checklist) {
}
