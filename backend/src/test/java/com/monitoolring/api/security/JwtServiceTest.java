package com.monitoolring.api.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Date;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.Test;

import com.monitoolring.api.domain.UserRole;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

class JwtServiceTest {

    private static final String SECRET = "test-secret-key-please-do-not-use-in-prod-min-32-bytes";
    private static final SecretKey KEY = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    private static final Duration EXPIRATION = Duration.ofHours(8);

    private final JwtService jwtService = new JwtService(SECRET, EXPIRATION);

    @Test
    void issuedTokenCarriesSubjectRoleAndConfiguredExpiration() {
        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        JwtService service = new JwtService(SECRET, EXPIRATION, Clock.fixed(now, ZoneOffset.UTC));

        IssuedToken issued = service.issueToken("user-123", UserRole.STAFF);

        Claims claims = Jwts.parser().verifyWith(KEY).build().parseSignedClaims(issued.token()).getPayload();
        assertThat(claims.getSubject()).isEqualTo("user-123");
        assertThat(claims.get("role", String.class)).isEqualTo("STAFF");
        assertThat(claims.getIssuedAt().toInstant()).isEqualTo(now);
        assertThat(claims.getExpiration().toInstant()).isEqualTo(now.plus(EXPIRATION));
        assertThat(issued.expiraEm()).isEqualTo(now.plus(EXPIRATION));
    }

    @Test
    void issuedTokenRoundTripsThroughValidation() {
        IssuedToken issued = jwtService.issueToken("user-456", UserRole.MEMBER);

        AuthenticatedUser user = jwtService.validate(issued.token());

        assertThat(user.userId()).isEqualTo("user-456");
        assertThat(user.role()).isEqualTo(UserRole.MEMBER);
    }

    @Test
    void extractsUserIdFromValidToken() {
        String token = Jwts.builder()
                .subject("user-123")
                .claim("role", "MEMBER")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(KEY)
                .compact();

        assertThat(jwtService.extractUserId(token)).isEqualTo("user-123");
    }

    @Test
    void rejectsTokenWithoutRole() {
        String token = Jwts.builder()
                .subject("user-123")
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(KEY)
                .compact();

        assertThatThrownBy(() -> jwtService.validate(token))
                .isInstanceOf(InvalidJwtException.class);
    }

    @Test
    void rejectsTokenWithUnknownRole() {
        String token = Jwts.builder()
                .subject("user-123")
                .claim("role", "ADMIN")
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(KEY)
                .compact();

        assertThatThrownBy(() -> jwtService.validate(token))
                .isInstanceOf(InvalidJwtException.class);
    }

    @Test
    void rejectsExpiredToken() {
        Instant past = Instant.now().minus(Duration.ofHours(9));
        JwtService issuedInThePast = new JwtService(SECRET, EXPIRATION, Clock.fixed(past, ZoneOffset.UTC));
        String token = issuedInThePast.issueToken("user-123", UserRole.MEMBER).token();

        assertThatThrownBy(() -> jwtService.validate(token))
                .isInstanceOf(InvalidJwtException.class);
    }

    @Test
    void rejectsTokenSignedWithDifferentSecret() {
        JwtService otherService = new JwtService(
                "another-completely-different-secret-key-32-bytes", EXPIRATION);
        String token = otherService.issueToken("user-123", UserRole.STAFF).token();

        assertThatThrownBy(() -> jwtService.validate(token))
                .isInstanceOf(InvalidJwtException.class);
    }

    @Test
    void rejectsMalformedToken() {
        assertThatThrownBy(() -> jwtService.validate("not-a-valid-token"))
                .isInstanceOf(InvalidJwtException.class);
    }
}
