package com.monitoolring.api.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.Test;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

class JwtServiceTest {

    private static final String SECRET = "test-secret-key-please-do-not-use-in-prod-min-32-bytes";
    private static final SecretKey KEY = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));

    private final JwtService jwtService = new JwtService(SECRET);

    @Test
    void extractsUserIdFromValidToken() {
        String token = Jwts.builder()
                .subject("user-123")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(KEY)
                .compact();

        String userId = jwtService.extractUserId(token);

        assertThat(userId).isEqualTo("user-123");
    }

    @Test
    void rejectsExpiredToken() {
        String token = Jwts.builder()
                .subject("user-123")
                .issuedAt(new Date(System.currentTimeMillis() - 120_000))
                .expiration(new Date(System.currentTimeMillis() - 60_000))
                .signWith(KEY)
                .compact();

        assertThatThrownBy(() -> jwtService.extractUserId(token))
                .isInstanceOf(InvalidJwtException.class);
    }

    @Test
    void rejectsTokenSignedWithDifferentSecret() {
        SecretKey otherKey = Keys.hmacShaKeyFor(
                "another-completely-different-secret-key-32-bytes".getBytes(StandardCharsets.UTF_8));
        String token = Jwts.builder()
                .subject("user-123")
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(otherKey)
                .compact();

        assertThatThrownBy(() -> jwtService.extractUserId(token))
                .isInstanceOf(InvalidJwtException.class);
    }

    @Test
    void rejectsMalformedToken() {
        assertThatThrownBy(() -> jwtService.extractUserId("not-a-valid-token"))
                .isInstanceOf(InvalidJwtException.class);
    }
}
