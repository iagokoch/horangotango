package com.monitoolring.api.dto;

import java.util.List;

import com.monitoolring.api.domain.FunctionalState;

import jakarta.validation.constraints.Size;

/**
 * Checklist de Conservação informado pelo Staff. Aqui só há validação de formato (tamanhos → 400);
 * a obrigatoriedade dos campos mínimos é regra de negócio do FR-10, verificada no service (→ 422).
 */
public record ChecklistRequest(
        FunctionalState estadoFuncional,

        @Size(max = 2000, message = "avariasVisiveis deve ter no máximo 2000 caracteres")
        String avariasVisiveis,

        @Size(max = 50, message = "acessoriosInclusos deve ter no máximo 50 itens")
        List<@Size(max = 255, message = "cada acessório deve ter no máximo 255 caracteres") String> acessoriosInclusos
) {
}
