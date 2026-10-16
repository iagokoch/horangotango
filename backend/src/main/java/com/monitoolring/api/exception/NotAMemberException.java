package com.monitoolring.api.exception;

/**
 * O id informado como Membro pertence a uma conta de Staff. Empréstimo liga uma Ferramenta a um
 * Membro (Glossário); o corpo é válido, mas o valor viola a regra de negócio — 422.
 */
public class NotAMemberException extends RuntimeException {

    public NotAMemberException(String id) {
        super("O usuário '" + id + "' é Staff, não Membro; empréstimos só podem ser registrados para Membros.");
    }
}
