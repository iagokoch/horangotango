package com.monitoolring.api.domain;

/**
 * Situação de um Empréstimo.
 * <ul>
 *   <li>{@code ACTIVE} — aberto desde a Retirada (FR-11).</li>
 *   <li>{@code RETURNED} — encerrado por Devolução (FR-13, ainda não implementado).</li>
 *   <li>{@code LOST} — encerrado por registro de Perda (FR-19, ainda não implementado).</li>
 * </ul>
 * Atraso não é um status gravado: é derivado em tempo real do Prazo de Devolução (FR-17).
 */
public enum LoanStatus {
    ACTIVE,
    RETURNED,
    LOST
}
