package com.monitoolring.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ToolCreateRequest(
        @NotBlank(message = "codigo é obrigatório")
        @Size(max = 18, message = "codigo deve ter no máximo 18 caracteres")
        String codigo,

        @NotBlank(message = "nome é obrigatório")
        @Size(max = 255, message = "nome deve ter no máximo 255 caracteres")
        String nome,

        @NotNull(message = "quantidade é obrigatória")
        @Min(value = 0, message = "quantidade deve ser maior ou igual a zero")
        Integer quantidade
) {
}
