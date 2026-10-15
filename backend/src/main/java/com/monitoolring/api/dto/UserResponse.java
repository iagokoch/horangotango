package com.monitoolring.api.dto;

import com.monitoolring.api.domain.UserRole;

/** Representação pública de uma conta — nunca inclui a senha nem o hash. */
public record UserResponse(
        String id,
        String nome,
        String email,
        UserRole papel
) {
}
