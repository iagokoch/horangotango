package com.monitoolring.api.exception;

/**
 * Login recusado. A mensagem é a mesma para e-mail inexistente e senha errada,
 * para não revelar se o e-mail está cadastrado (FR-1).
 */
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException() {
        super("E-mail ou senha inválidos.");
    }
}
