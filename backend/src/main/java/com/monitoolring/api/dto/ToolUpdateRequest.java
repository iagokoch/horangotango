package com.monitoolring.api.dto;

import java.math.BigDecimal;

import com.monitoolring.api.domain.ToolStatus;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Edição parcial de Ferramenta (PATCH, FR-4). Só {@code versao} é obrigatória (optimistic lock);
 * campos ausentes ou nulos não são alterados, mas se enviados não podem estar em branco
 * (o {@code @Pattern} exige ao menos um caractere que não seja espaço e aceita {@code null}).
 * {@code status} aceita apenas AVAILABLE (reativar) ou INACTIVE (inativar).
 */
public record ToolUpdateRequest(
        @Pattern(regexp = "(?s).*\\S.*", message = "codigo não pode ser vazio")
        @Size(max = 18, message = "codigo deve ter no máximo 18 caracteres")
        String codigo,

        @Pattern(regexp = "(?s).*\\S.*", message = "nome não pode ser vazio")
        @Size(max = 255, message = "nome deve ter no máximo 255 caracteres")
        String nome,

        @Pattern(regexp = "(?s).*\\S.*", message = "categoria não pode ser vazia")
        @Size(max = 100, message = "categoria deve ter no máximo 100 caracteres")
        String categoria,

        @Positive(message = "valorEstimado deve ser maior que zero")
        @Digits(integer = 10, fraction = 2,
                message = "valorEstimado deve ter no máximo 10 dígitos inteiros e 2 casas decimais")
        BigDecimal valorEstimado,

        @Pattern(regexp = "(?s).*\\S.*", message = "estadoConservacao não pode ser vazio")
        @Size(max = 1000, message = "estadoConservacao deve ter no máximo 1000 caracteres")
        String estadoConservacao,

        @Schema(description = "Só AVAILABLE (reativar) ou INACTIVE (inativar). ON_LOAN, LOST e "
                + "UNDER_REPAIR são definidos pelos fluxos de empréstimo e devolvem 422.")
        ToolStatus status,

        @Schema(description = "Versão atual do registro (optimistic lock); divergente devolve 409.")
        @NotNull(message = "versao é obrigatória")
        Integer versao
) {
}
