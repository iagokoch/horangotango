package com.monitoolring.api.security;

import java.time.Instant;

/**
 * Token JWT recém-emitido e o instante em que expira (claim {@code exp}).
 */
public record IssuedToken(String token, Instant expiraEm) {
}
