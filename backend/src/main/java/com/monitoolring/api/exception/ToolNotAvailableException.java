package com.monitoolring.api.exception;

import com.monitoolring.api.domain.ToolStatus;

/** Retirada recusada porque a Ferramenta não está disponível (FR-9) — 409 com o status atual. */
public class ToolNotAvailableException extends RuntimeException {

    public ToolNotAvailableException(String codigo, ToolStatus status) {
        super("A ferramenta '" + codigo + "' não está disponível para retirada: status atual "
                + status + " (" + status.getRotulo() + ").");
    }

    /** Usado quando o banco recusa um segundo empréstimo ativo concorrente para a mesma Ferramenta. */
    public ToolNotAvailableException(String idFerramenta) {
        super("A ferramenta '" + idFerramenta + "' acabou de ser retirada por outra requisição e não está "
                + "mais disponível.");
    }
}
