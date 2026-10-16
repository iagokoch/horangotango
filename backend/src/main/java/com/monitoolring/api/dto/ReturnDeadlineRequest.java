package com.monitoolring.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Novo prazo padrão de devolução, em dias corridos (FR-8). O teto de 365 dias evita erros de
 * digitação (ex.: 300 em vez de 30) e nenhum empréstimo de oficina faz sentido por mais de um ano.
 */
public record ReturnDeadlineRequest(
        @NotNull(message = "dias é obrigatório")
        @Min(value = 1, message = "dias deve ser no mínimo 1")
        @Max(value = 365, message = "dias deve ser no máximo 365")
        Integer dias
) {
}
