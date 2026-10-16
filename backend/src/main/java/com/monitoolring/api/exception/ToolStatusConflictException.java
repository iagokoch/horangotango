package com.monitoolring.api.exception;

/**
 * Mudança de status recusada por causa do estado atual da Ferramenta (409) — ex.: inativar uma
 * Ferramenta emprestada antes da Devolução ou do registro de Perda (FR-4).
 */
public class ToolStatusConflictException extends RuntimeException {

    public ToolStatusConflictException(String codigo) {
        super("A ferramenta '" + codigo + "' está emprestada; o status só pode mudar após a devolução "
                + "ou o registro de perda.");
    }
}
