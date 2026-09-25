package com.monitoolring.api.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "ferramentas")
public class Tool {

    @Id
    @Column(name = "id", length = 38, nullable = false, updatable = false)
    private String id;

    @Column(name = "codigo", length = 18, nullable = false, unique = true)
    private String codigo;

    @Column(name = "nome", length = 255, nullable = false)
    private String nome;

    @Column(name = "quantidade", nullable = false)
    private int quantidade;

    @Column(name = "id_usuario_criacao", length = 38, nullable = false, updatable = false)
    private String idUsuarioCriacao;

    @Column(name = "data_hora_criacao", nullable = false, updatable = false)
    private Instant dataHoraCriacao;

    @Column(name = "id_usuario_alteracao", length = 38, nullable = false)
    private String idUsuarioAlteracao;

    @Column(name = "data_hora_alteracao", nullable = false)
    private Instant dataHoraAlteracao;

    @Version
    @Column(name = "versao", nullable = false)
    private int versao;

    protected Tool() {
        // exigido pelo JPA
    }

    private Tool(String id, String codigo, String nome, int quantidade, String idUsuario, Instant now) {
        this.id = id;
        this.codigo = codigo;
        this.nome = nome;
        this.quantidade = quantidade;
        this.idUsuarioCriacao = idUsuario;
        this.dataHoraCriacao = now;
        this.idUsuarioAlteracao = idUsuario;
        this.dataHoraAlteracao = now;
    }

    public static Tool criar(String id, String codigo, String nome, int quantidade, String idUsuario, Instant now) {
        return new Tool(id, codigo, nome, quantidade, idUsuario, now);
    }

    public void aplicarEdicao(String codigo, String nome, int quantidade, String idUsuario, Instant now) {
        this.codigo = codigo;
        this.nome = nome;
        this.quantidade = quantidade;
        this.idUsuarioAlteracao = idUsuario;
        this.dataHoraAlteracao = now;
    }

    public String getId() {
        return id;
    }

    public String getCodigo() {
        return codigo;
    }

    public String getNome() {
        return nome;
    }

    public int getQuantidade() {
        return quantidade;
    }

    public String getIdUsuarioCriacao() {
        return idUsuarioCriacao;
    }

    public Instant getDataHoraCriacao() {
        return dataHoraCriacao;
    }

    public String getIdUsuarioAlteracao() {
        return idUsuarioAlteracao;
    }

    public Instant getDataHoraAlteracao() {
        return dataHoraAlteracao;
    }

    public int getVersao() {
        return versao;
    }
}
