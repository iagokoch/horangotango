package com.monitoolring.api.exception;

import java.util.List;

/**
 * Checklist de Conservação ausente ou com campo mínimo em branco (Glossário, FR-10) — regra de
 * negócio, respondida com 422 e a lista do que falta em {@code details}.
 */
public class IncompleteChecklistException extends RuntimeException {

    private final List<String> problemas;

    public IncompleteChecklistException(List<String> problemas) {
        super("Checklist de Conservação incompleto: a retirada não pode ser confirmada sem os campos mínimos "
                + "preenchidos.");
        this.problemas = List.copyOf(problemas);
    }

    public List<String> getProblemas() {
        return problemas;
    }
}
