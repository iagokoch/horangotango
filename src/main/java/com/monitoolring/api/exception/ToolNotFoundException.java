package com.monitoolring.api.exception;

public class ToolNotFoundException extends RuntimeException {

    public ToolNotFoundException(String id) {
        super("Ferramenta com id '" + id + "' não foi encontrada.");
    }
}
