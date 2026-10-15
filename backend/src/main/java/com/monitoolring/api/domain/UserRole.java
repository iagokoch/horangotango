package com.monitoolring.api.domain;

/**
 * Papel de uma conta no sistema (Glossário do PRD).
 * <ul>
 *   <li>{@code MEMBER} — Membro: pega Ferramentas emprestadas; criado por autocadastro (FR-1).</li>
 *   <li>{@code STAFF} — Responsável da Oficina: opera o balcão e gerencia cadastros; só é criado
 *       por outro Staff ou pelo bootstrap inicial (FR-2).</li>
 * </ul>
 */
public enum UserRole {
    MEMBER,
    STAFF
}
