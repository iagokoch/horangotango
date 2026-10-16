package com.monitoolring.api.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Prazo padrão de devolução (FR-8), em dias corridos. Singleton: existe no máximo uma linha,
 * sempre com id {@link #SINGLETON_ID}. A alteração só afeta Retiradas novas — cada Empréstimo
 * grava os dias vigentes no momento da própria Retirada.
 */
@Entity
@Table(name = "configuracao_prazo_devolucao")
public class ReturnDeadlineSetting {

    public static final int SINGLETON_ID = 1;
    public static final int MIN_DIAS = 1;
    public static final int MAX_DIAS = 365;

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private Integer id;

    @Column(name = "dias", nullable = false)
    private int dias;

    @Column(name = "id_usuario_alteracao", length = 38, nullable = false)
    private String idUsuarioAlteracao;

    @Column(name = "data_hora_alteracao", nullable = false)
    private Instant dataHoraAlteracao;

    protected ReturnDeadlineSetting() {
        // exigido pelo JPA
    }

    public static ReturnDeadlineSetting criar(int dias, String idUsuario, Instant now) {
        ReturnDeadlineSetting setting = new ReturnDeadlineSetting();
        setting.id = SINGLETON_ID;
        setting.definir(dias, idUsuario, now);
        return setting;
    }

    public void definir(int dias, String idUsuario, Instant now) {
        this.dias = dias;
        this.idUsuarioAlteracao = idUsuario;
        this.dataHoraAlteracao = now;
    }

    public Integer getId() {
        return id;
    }

    public int getDias() {
        return dias;
    }

    public String getIdUsuarioAlteracao() {
        return idUsuarioAlteracao;
    }

    public Instant getDataHoraAlteracao() {
        return dataHoraAlteracao;
    }
}
