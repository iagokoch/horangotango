package com.monitoolring.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.stream.Stream;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.monitoolring.api.config.PasswordEncoderConfig;
import com.monitoolring.api.domain.User;
import com.monitoolring.api.repository.UserRepository;
import com.monitoolring.api.service.UserService.StaffBootstrapResult;

class PasswordBootstrapTest {

    @ParameterizedTest
    @MethodSource("invalidPasswords")
    void bootstrapRejectsInvalidPasswordBeforePersisting(String password) {
        UserRepository repository = mock(UserRepository.class);
        UserService service = new UserService(repository, new PasswordEncoderConfig().passwordEncoder());

        assertThat(service.bootstrapFirstStaff("Staff", "staff@example.com", password))
                .isEqualTo(StaffBootstrapResult.INVALID_PASSWORD);
        verify(repository, never()).saveAndFlush(any());
    }

    @ParameterizedTest
    @MethodSource("acceptedPasswords")
    void bootstrapAcceptsPasswordsAtCharacterAndUtf8Boundaries(String password) {
        UserRepository repository = mock(UserRepository.class);
        when(repository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        PasswordEncoder encoder = new PasswordEncoderConfig().passwordEncoder();
        UserService service = new UserService(repository, encoder);

        assertThat(service.bootstrapFirstStaff("Staff", "staff@example.com", password))
                .isEqualTo(StaffBootstrapResult.CREATED);
        var saved = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(repository).saveAndFlush(saved.capture());
        assertThat(encoder.matches(password, saved.getValue().getSenhaHash())).isTrue();
    }

    static Stream<String> invalidPasswords() {
        return Stream.of("curta", "a".repeat(73), "é".repeat(36) + "a",
                "\uD83D\uDE00".repeat(18) + "a", "é".repeat(36) + "AAA");
    }

    static Stream<String> acceptedPasswords() {
        return Stream.of("a".repeat(8), "a".repeat(72), "é".repeat(35) + "a",
                "é".repeat(36), "\uD83D\uDE00".repeat(18));
    }
}
