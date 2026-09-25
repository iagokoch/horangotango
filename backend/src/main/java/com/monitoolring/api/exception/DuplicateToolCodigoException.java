package com.monitoolring.api.exception;

public class DuplicateToolCodigoException extends RuntimeException {

    public DuplicateToolCodigoException(String codigo) {
        super("Já existe uma ferramenta cadastrada com o código '" + codigo + "'.");
    }
}
