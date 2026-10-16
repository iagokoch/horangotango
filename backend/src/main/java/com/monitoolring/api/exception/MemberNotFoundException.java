package com.monitoolring.api.exception;

public class MemberNotFoundException extends RuntimeException {

    public MemberNotFoundException(String id) {
        super("Membro com id '" + id + "' não foi encontrado.");
    }
}
