package com.monitoolring.api.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "usuarios")
public class User {

    @Id
    @Column(name = "id", length = 38, nullable = false, updatable = false)
    private String id;

    @Column(name = "nome", length = 255, nullable = false)
    private String nome;

    @Column(name = "email", length = 255, nullable = false, unique = true)
    private String email;

    @Column(name = "senha_hash", length = 100, nullable = false)
    private String senhaHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "papel", length = 20, nullable = false, updatable = false)
    private UserRole papel;

    @Column(name = "id_usuario_criacao", length = 38, nullable = false, updatable = false)
    private String idUsuarioCriacao;

    @Column(name = "data_hora_criacao", nullable = false, updatable = false)
    private Instant dataHoraCriacao;

    protected User() {
        // exigido pelo JPA
    }

    private User(String id, String nome, String email, String senhaHash, UserRole papel,
            String idUsuarioCriacao, Instant now) {
        this.id = id;
        this.nome = nome;
        this.email = email;
        this.senhaHash = senhaHash;
        this.papel = papel;
        this.idUsuarioCriacao = idUsuarioCriacao;
        this.dataHoraCriacao = now;
    }

    /**
     * Cria uma conta. {@code email} já deve estar normalizado (minúsculas, sem espaços nas pontas)
     * e {@code senhaHash} já deve ser o hash — a entidade nunca recebe a senha em texto plano.
     * {@code idUsuarioCriacao} nulo indica autocriação (autocadastro ou bootstrap) e grava o próprio id.
     */
    public static User criar(String id, String nome, String email, String senhaHash, UserRole papel,
            String idUsuarioCriacao, Instant now) {
        String criador = idUsuarioCriacao != null ? idUsuarioCriacao : id;
        return new User(id, nome, email, senhaHash, papel, criador, now);
    }

    public String getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public String getEmail() {
        return email;
    }

    public String getSenhaHash() {
        return senhaHash;
    }

    public UserRole getPapel() {
        return papel;
    }

    public String getIdUsuarioCriacao() {
        return idUsuarioCriacao;
    }

    public Instant getDataHoraCriacao() {
        return dataHoraCriacao;
    }
}
