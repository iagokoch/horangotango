package com.monitoolring.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.monitoolring.api.domain.User;
import com.monitoolring.api.domain.UserRole;
import com.monitoolring.api.exception.InvalidCredentialsException;
import com.monitoolring.api.repository.UserRepository;
import com.monitoolring.api.security.AuthenticatedUser;
import com.monitoolring.api.security.JwtService;

class AuthServiceTest {

    private static final String SECRET = "test-secret-key-please-do-not-use-in-prod-min-32-bytes";

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    private final JwtService jwtService = new JwtService(SECRET, Duration.ofHours(8));
    private UserRepository userRepository;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        authService = new AuthService(userRepository, passwordEncoder, jwtService);
    }

    @Test
    void loginWithValidCredentialsIssuesTokenWithUserRole() {
        User staff = User.criar("staff-1", "Bruno", "bruno@example.com",
                passwordEncoder.encode("senha-forte-1"), UserRole.STAFF, null, Instant.now());
        when(userRepository.findByEmail("bruno@example.com")).thenReturn(Optional.of(staff));

        AuthService.Session session = authService.login("  Bruno@Example.com ", "senha-forte-1");

        AuthenticatedUser fromToken = jwtService.validate(session.token().token());
        assertThat(fromToken.userId()).isEqualTo("staff-1");
        assertThat(fromToken.role()).isEqualTo(UserRole.STAFF);
        assertThat(session.user()).isSameAs(staff);
    }

    @Test
    void wrongPasswordAndUnknownEmailFailTheSameWay() {
        User member = User.criar("m-1", "Marcos", "marcos@example.com",
                passwordEncoder.encode("senha-forte-1"), UserRole.MEMBER, null, Instant.now());
        when(userRepository.findByEmail("marcos@example.com")).thenReturn(Optional.of(member));
        when(userRepository.findByEmail("ninguem@example.com")).thenReturn(Optional.empty());

        Throwable wrongPassword = catchThrowable(
                () -> authService.login("marcos@example.com", "senha-errada"));
        Throwable unknownEmail = catchThrowable(
                () -> authService.login("ninguem@example.com", "senha-forte-1"));

        assertThat(wrongPassword).isInstanceOf(InvalidCredentialsException.class);
        assertThat(unknownEmail).isInstanceOf(InvalidCredentialsException.class);
        assertThat(wrongPassword.getMessage()).isEqualTo(unknownEmail.getMessage());
    }

    @Test
    void unknownEmailIsRejected() {
        when(userRepository.findByEmail("x@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login("x@example.com", "qualquer-senha"))
                .isInstanceOf(InvalidCredentialsException.class);
    }
}
