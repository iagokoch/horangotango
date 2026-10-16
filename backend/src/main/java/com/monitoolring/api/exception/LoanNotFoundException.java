package com.monitoolring.api.exception;

public class LoanNotFoundException extends RuntimeException {

    public LoanNotFoundException(String id) {
        super("Empréstimo com id '" + id + "' não foi encontrado.");
    }
}
