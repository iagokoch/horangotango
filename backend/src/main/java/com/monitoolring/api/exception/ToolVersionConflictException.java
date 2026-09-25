package com.monitoolring.api.exception;

public class ToolVersionConflictException extends RuntimeException {

    public ToolVersionConflictException(String id, int expectedVersion, int actualVersion) {
        super("Ferramenta '" + id + "' foi alterada por outra requisição (versão enviada: "
                + expectedVersion + ", versão atual: " + actualVersion + ").");
    }
}
