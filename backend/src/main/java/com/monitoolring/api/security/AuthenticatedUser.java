package com.monitoolring.api.security;

import com.monitoolring.api.domain.UserRole;

/**
 * Identidade extraída de um token JWT válido: id do usuário (claim {@code sub}) e papel (claim {@code role}).
 */
public record AuthenticatedUser(String userId, UserRole role) {
}
