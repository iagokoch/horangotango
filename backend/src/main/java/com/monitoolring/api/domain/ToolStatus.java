package com.monitoolring.api.domain;

/**
 * Status de disponibilidade de uma Ferramenta (Glossário do PRD).
 * <ul>
 *   <li>{@code AVAILABLE} — disponível para Retirada.</li>
 *   <li>{@code ON_LOAN} — emprestada (definido pela Retirada, FR-11).</li>
 *   <li>{@code UNDER_REPAIR} — em reparo/inspeção (definido pela Devolução com divergência, FR-15/FR-16).</li>
 *   <li>{@code LOST} — perdida (definido pelo registro de Perda, FR-19).</li>
 *   <li>{@code INACTIVE} — inativa, fora de circulação (FR-4).</li>
 * </ul>
 */
public enum ToolStatus {
    AVAILABLE("disponível"),
    ON_LOAN("emprestada"),
    UNDER_REPAIR("em reparo/inspeção"),
    LOST("perdida"),
    INACTIVE("inativa");

    private final String rotulo;

    ToolStatus(String rotulo) {
        this.rotulo = rotulo;
    }

    /** Nome do status no vocabulário do PRD, para mensagens ao usuário. */
    public String getRotulo() {
        return rotulo;
    }

    /**
     * Indica se Staff pode definir este status manualmente na edição da Ferramenta
     * (reativar ou inativar — FR-4, FR-15, FR-19). Os demais são consequência exclusiva
     * dos fluxos de Empréstimo, Devolução e Perda.
     */
    public boolean isManuallyAssignable() {
        return this == AVAILABLE || this == INACTIVE;
    }
}
