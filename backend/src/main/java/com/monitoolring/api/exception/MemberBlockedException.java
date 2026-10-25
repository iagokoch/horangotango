package com.monitoolring.api.exception;

import java.util.List;

/** Bloqueio por empréstimos em atraso (FR-12), respondido com 409 e todas as pendências. */
public class MemberBlockedException extends RuntimeException {

    private final List<String> emprestimosEmAtraso;

    public MemberBlockedException(List<String> emprestimosEmAtraso) {
        super("Membro bloqueado por inadimplência. " + String.join(" ", emprestimosEmAtraso));
        this.emprestimosEmAtraso = List.copyOf(emprestimosEmAtraso);
    }

    public List<String> getEmprestimosEmAtraso() {
        return emprestimosEmAtraso;
    }
}
