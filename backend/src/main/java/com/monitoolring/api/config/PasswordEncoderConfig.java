package com.monitoolring.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.monitoolring.api.security.LengthCheckedBcryptPasswordEncoder;

@Configuration
public class PasswordEncoderConfig {

    /** BCrypt com recusa explícita de entradas acima de 72 bytes UTF-8 (FR-1 e issue #26). */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new LengthCheckedBcryptPasswordEncoder();
    }
}
