package com.monitoolring.api.dto;

import java.time.Instant;

import com.monitoolring.api.domain.LoanStatus;

public record LoanResponse(
        String id,
        String ferramentaId,
        String membroId,
        String staffRetiradaId,
        Instant dataHoraRetirada,
        int diasPrazo,
        Instant prazoDevolucao,
        LoanStatus status,
        ChecklistResponse checklistRetirada
) {
}
