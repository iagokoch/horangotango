package com.monitoolring.api.support;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import com.monitoolring.api.domain.UserRole;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

public final class JwtTestTokenFactory {

    public static final String SECRET = "test-secret-key-please-do-not-use-in-prod-min-32-bytes";
    private static final SecretKey KEY = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));

    private JwtTestTokenFactory() {
    }

    public static String validTokenFor(String userId, UserRole role) {
        return Jwts.builder()
                .subject(userId)
                .claim("role", role.name())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 600_000))
                .signWith(KEY)
                .compact();
    }

    public static String staffToken(String userId) {
        return validTokenFor(userId, UserRole.STAFF);
    }

    public static String memberToken(String userId) {
        return validTokenFor(userId, UserRole.MEMBER);
    }

    /** Token assinado com a chave correta, mas sem a claim {@code exp} (nunca expiraria). */
    public static String tokenWithoutExpirationFor(String userId, UserRole role) {
        return Jwts.builder()
                .subject(userId)
                .claim("role", role.name())
                .issuedAt(new Date())
                .signWith(KEY)
                .compact();
    }

    public static String expiredTokenFor(String userId, UserRole role) {
        return Jwts.builder()
                .subject(userId)
                .claim("role", role.name())
                .issuedAt(new Date(System.currentTimeMillis() - 120_000))
                .expiration(new Date(System.currentTimeMillis() - 60_000))
                .signWith(KEY)
                .compact();
    }
}
