package com.monitoolring.api.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.util.stream.Stream;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.monitoolring.api.config.PasswordEncoderConfig;

class PasswordEncoderSecurityTest {

    private final PasswordEncoder encoder = new PasswordEncoderConfig().passwordEncoder();

    @ParameterizedTest
    @MethodSource("acceptedPasswords")
    void existingBcryptHashesWithinLimitRemainCompatible(String password) {
        String legacyHash = new BCryptPasswordEncoder(4).encode(password);

        assertThat(encoder.matches(password, legacyHash)).isTrue();
        assertThat(encoder.matches("senha-diferente", legacyHash)).isFalse();
    }

    @ParameterizedTest
    @MethodSource("oversizedPasswords")
    void encodingRejectsPasswordsAbove72Utf8Bytes(String password) {
        assertThatIllegalArgumentException().isThrownBy(() -> encoder.encode(password));
    }

    @ParameterizedTest
    @MethodSource("oversizedPasswords")
    void matchingRejectsSuffixesThatLegacyBcryptDiscards(String password) {
        String legacyHash = new BCryptPasswordEncoder(4).encode(password);

        assertThat(encoder.matches(password, legacyHash)).isFalse();
        assertThat(encoder.matches(password + "outro-sufixo", legacyHash)).isFalse();
    }

    static Stream<String> acceptedPasswords() {
        return Stream.of("a".repeat(8), "a".repeat(72), "é".repeat(35) + "a",
                "é".repeat(36), "\uD83D\uDE00".repeat(18));
    }

    static Stream<String> oversizedPasswords() {
        return Stream.of("a".repeat(73), "é".repeat(36) + "a",
                "\uD83D\uDE00".repeat(18) + "a", "é".repeat(36) + "AAA");
    }
}
