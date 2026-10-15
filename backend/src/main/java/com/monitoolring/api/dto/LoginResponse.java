package com.monitoolring.api.dto;

import java.time.Instant;

/**
 * Resposta do login: token JWT a ser enviado como {@code Authorization: Bearer <token>},
 * instante de expiração e dados da conta autenticada.
 */
public record LoginResponse(
        String token,
        String tipo,
        Instant expiraEm,
        UserResponse usuario
) {

    public static final String TIPO_BEARER = "Bearer";
}
