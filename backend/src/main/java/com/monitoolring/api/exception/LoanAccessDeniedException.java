package com.monitoolring.api.exception;

/** Membro tentando consultar Empréstimo de outro Membro (FR-7, §5 Privacidade) — 403. */
public class LoanAccessDeniedException extends RuntimeException {

    public LoanAccessDeniedException() {
        super("Membro só pode consultar os próprios empréstimos.");
    }
}
