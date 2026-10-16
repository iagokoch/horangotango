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
    AVAILABLE,
    ON_LOAN,
    UNDER_REPAIR,
    LOST,
    INACTIVE;

    /**
     * Indica se Staff pode definir este status manualmente na edição da Ferramenta
     * (reativar ou inativar — FR-4, FR-15, FR-19). Os demais são consequência exclusiva
     * dos fluxos de Empréstimo, Devolução e Perda.
     */
    public boolean isManuallyAssignable() {
        return this == AVAILABLE || this == INACTIVE;
    }
}
