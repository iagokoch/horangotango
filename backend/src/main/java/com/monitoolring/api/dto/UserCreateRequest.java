package com.monitoolring.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import com.monitoolring.api.validation.ValidPassword;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Corpo de criação de conta, usado tanto no autocadastro de Membro quanto no cadastro de Staff.
 * Não existe campo de papel: o papel é decidido pela rota chamada (FR-2).
 * A senha tem no mínimo 8 caracteres e no máximo 72 bytes UTF-8, limite do BCrypt.
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
        @ValidPassword
        @Schema(description = "No mínimo 8 caracteres e no máximo 72 bytes UTF-8. "
                + "Caracteres acentuados e emojis podem ocupar mais de um byte.")
        String senha
) {
}
