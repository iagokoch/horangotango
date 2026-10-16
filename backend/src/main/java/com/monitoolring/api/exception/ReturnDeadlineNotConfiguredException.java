package com.monitoolring.api.exception;

/**
 * O prazo padrão de devolução ainda não foi configurado por Staff (FR-8).
 * Na consulta da configuração vira 404; na confirmação de Retirada vira 409.
 */
public class ReturnDeadlineNotConfiguredException extends RuntimeException {

    public ReturnDeadlineNotConfiguredException() {
        super("O prazo padrão de devolução ainda não foi configurado. Um Staff deve defini-lo em "
                + "PUT /api/settings/return-deadline antes de qualquer retirada.");
    }
}
