package com.monitoolring.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Corpo de criação de conta, usado tanto no autocadastro de Membro quanto no cadastro de Staff.
 * Não existe campo de papel: o papel é decidido pela rota chamada (FR-2).
 * O limite de 72 caracteres da senha é o máximo que o BCrypt considera.
 */
public record UserCreateRequest(
        @NotBlank(message = "nome é obrigatório")
        @Size(max = 255, message = "nome deve ter no máximo 255 caracteres")
        String nome,

        @NotBlank(message = "email é obrigatório")
        @Email(message = "email deve ser um endereço de e-mail válido")
        @Size(max = 255, message = "email deve ter no máximo 255 caracteres")
        String email,

        @NotBlank(message = "senha é obrigatória")
        @Size(min = 8, max = 72, message = "senha deve ter entre 8 e 72 caracteres")
        String senha
) {
}
