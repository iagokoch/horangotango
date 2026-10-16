package com.monitoolring.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

/**
 * Confirmação de Retirada pelo Staff (FR-9 a FR-11). {@code checklist} ausente não é erro de formato:
 * é Checklist em branco, recusado com 422 pela regra do FR-10.
 */
public record LoanCreateRequest(
        @NotBlank(message = "ferramentaId é obrigatório")
        String ferramentaId,

        @NotBlank(message = "membroId é obrigatório")
        String membroId,

        @Valid
        ChecklistRequest checklist
) {
}
