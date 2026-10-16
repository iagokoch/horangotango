package com.monitoolring.api.exception;

import com.monitoolring.api.domain.ToolStatus;

/**
 * Status pedido na edição nunca pode ser definido manualmente, independentemente do estado atual
 * da Ferramenta (ex.: {@code ON_LOAN}, {@code LOST}) — valor inválido para a regra de negócio (422).
 */
public class InvalidToolStatusTransitionException extends RuntimeException {

    public InvalidToolStatusTransitionException(ToolStatus requested) {
        super("O status '" + requested + "' não pode ser definido manualmente. Pela edição só é possível "
                + "reativar (AVAILABLE) ou inativar (INACTIVE) uma ferramenta; os demais status são definidos "
                + "pelos fluxos de empréstimo, devolução e perda.");
    }
}
