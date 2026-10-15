package com.monitoolring.api.security;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.monitoolring.api.domain.UserRole;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
 * Emite e valida os tokens JWT (HS256) da API.
 *
 * <p>Claims emitidas: {@code sub} = id do usuário, {@code role} = papel ({@code MEMBER}/{@code STAFF}),
 * {@code iat} e {@code exp}. A validade vem de {@code app.jwt.expiration}, um {@link Duration}
 * (aceita ISO-8601 como {@code PT8H} ou o formato simples do Spring como {@code 8h}).
 *
 * <p>Tokens sem claim {@code role} (ou com papel desconhecido) são rejeitados.
 */
@Component
public class JwtService {

    static final String ROLE_CLAIM = "role";

    private final SecretKey key;
    private final Duration expiration;
    private final Clock clock;

    @Autowired
    public JwtService(@Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration}") Duration expiration) {
        this(secret, expiration, Clock.systemUTC());
    }

    JwtService(String secret, Duration expiration, Clock clock) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiration = expiration;
        this.clock = clock;
    }

    public IssuedToken issueToken(String userId, UserRole role) {
        // JWT trabalha com segundos inteiros; trunca para que expiraEm bata exatamente com a claim exp.
        Instant issuedAt = clock.instant().truncatedTo(ChronoUnit.SECONDS);
        Instant expiresAt = issuedAt.plus(expiration);
        String token = Jwts.builder()
                .subject(userId)
                .claim(ROLE_CLAIM, role.name())
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiresAt))
                .signWith(key)
                .compact();
        return new IssuedToken(token, expiresAt);
    }

    public AuthenticatedUser validate(String token) {
        Claims claims;
        try {
            claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException ex) {
            throw new InvalidJwtException("Token JWT inválido ou expirado.", ex);
        }
        String userId = claims.getSubject();
        if (userId == null || userId.isBlank()) {
            throw new InvalidJwtException("Token JWT sem identificação do usuário.", null);
        }
        return new AuthenticatedUser(userId, parseRole(claims.get(ROLE_CLAIM, String.class)));
    }

    public String extractUserId(String token) {
        return validate(token).userId();
    }

    private static UserRole parseRole(String role) {
        if (role == null) {
            throw new InvalidJwtException("Token JWT sem papel do usuário.", null);
        }
        try {
            return UserRole.valueOf(role);
        } catch (IllegalArgumentException ex) {
            throw new InvalidJwtException("Token JWT com papel desconhecido.", ex);
        }
    }
}
