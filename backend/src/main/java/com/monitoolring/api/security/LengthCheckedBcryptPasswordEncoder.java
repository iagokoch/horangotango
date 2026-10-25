package com.monitoolring.api.security;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Impede o descarte silencioso de sufixos pelo BCrypt da dependência atual.
 * Preserva o formato dos hashes legados e recusa entradas acima de 72 bytes UTF-8, inclusive
 * no login. O hash não permite identificar ou recuperar sufixos descartados anteriormente.
 */
public final class LengthCheckedBcryptPasswordEncoder implements PasswordEncoder {

    private final PasswordEncoder delegate = new BCryptPasswordEncoder();

    @Override
    public String encode(CharSequence rawPassword) {
        if (!PasswordPolicy.fitsBcrypt(rawPassword)) {
            throw new IllegalArgumentException("Senha deve ter no máximo 72 bytes em UTF-8.");
        }
        return delegate.encode(rawPassword);
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        return PasswordPolicy.fitsBcrypt(rawPassword) && delegate.matches(rawPassword, encodedPassword);
    }

    @Override
    public boolean upgradeEncoding(String encodedPassword) {
        return delegate.upgradeEncoding(encodedPassword);
    }
}
