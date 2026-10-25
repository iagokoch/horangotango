package com.monitoolring.api.exception;

import com.monitoolring.api.domain.LoanStatus;

/** Devolução exige empréstimo ACTIVE; empréstimo já encerrado recebe 409. */
public class LoanAlreadyClosedException extends RuntimeException {

    public LoanAlreadyClosedException(String id, LoanStatus status) {
        super("Empréstimo com id '" + id + "' já foi encerrado (status " + status + ").");
    }
}
