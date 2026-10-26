package com.monitoolring.api.security;

import java.nio.charset.StandardCharsets;

/** Limites compartilhados pelo cadastro, bootstrap e encoder BCrypt. */
public final class PasswordPolicy {

    public static final int MIN_CHARACTERS = 8;
    public static final int MAX_UTF8_BYTES = 72;

    private PasswordPolicy() {
    }

    public static boolean isValidForCreation(String password) {
        return password != null && !password.isBlank() && password.length() >= MIN_CHARACTERS
                && fitsBcrypt(password);
    }

    /** O teto é em bytes: caracteres acentuados e emojis podem ocupar mais de um byte. */
    public static boolean fitsBcrypt(CharSequence password) {
        return password != null && password.length() <= MAX_UTF8_BYTES
                && password.toString().getBytes(StandardCharsets.UTF_8).length <= MAX_UTF8_BYTES;
    }
}
