package com.monitoolring.api.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** Cadastro de Ferramenta (FR-3). Não aceita status: toda Ferramenta nasce AVAILABLE. */
public record ToolCreateRequest(
        @NotBlank(message = "codigo é obrigatório")
        @Size(max = 18, message = "codigo deve ter no máximo 18 caracteres")
        String codigo,

        @NotBlank(message = "nome é obrigatório")
        @Size(max = 255, message = "nome deve ter no máximo 255 caracteres")
        String nome,

        @NotBlank(message = "categoria é obrigatória")
        @Size(max = 100, message = "categoria deve ter no máximo 100 caracteres")
        String categoria,

        @NotNull(message = "valorEstimado é obrigatório")
        @Positive(message = "valorEstimado deve ser maior que zero")
        @Digits(integer = 10, fraction = 2,
                message = "valorEstimado deve ter no máximo 10 dígitos inteiros e 2 casas decimais")
        BigDecimal valorEstimado,

        @NotBlank(message = "estadoConservacao é obrigatório")
        @Size(max = 1000, message = "estadoConservacao deve ter no máximo 1000 caracteres")
        String estadoConservacao
) {
}
