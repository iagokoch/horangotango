package com.monitoolring.api.exception;

public class DuplicateUserEmailException extends RuntimeException {

    public DuplicateUserEmailException(String email) {
        super("Já existe uma conta cadastrada com o e-mail '" + email + "'.");
    }
}
