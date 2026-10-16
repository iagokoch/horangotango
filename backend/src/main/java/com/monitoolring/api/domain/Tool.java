package com.monitoolring.api.domain;

import java.math.BigDecimal;
import java.time.Instant;

import com.monitoolring.api.exception.InvalidToolStatusTransitionException;
import com.monitoolring.api.exception.ToolNotAvailableException;
import com.monitoolring.api.exception.ToolStatusConflictException;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

    @Column(name = "categoria", length = 100, nullable = false)
    private String categoria;

    @Column(name = "valor_estimado", precision = 12, scale = 2, nullable = false)
    private BigDecimal valorEstimado;

    @Column(name = "estado_conservacao", length = 1000, nullable = false)
    private String estadoConservacao;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private ToolStatus status;

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

    private Tool(String id, String codigo, String nome, String categoria, BigDecimal valorEstimado,
            String estadoConservacao, String idUsuario, Instant now) {
        this.id = id;
        this.codigo = codigo;
        this.nome = nome;
        this.categoria = categoria;
        this.valorEstimado = valorEstimado;
        this.estadoConservacao = estadoConservacao;
        this.status = ToolStatus.AVAILABLE;
        this.idUsuarioCriacao = idUsuario;
        this.dataHoraCriacao = now;
        this.idUsuarioAlteracao = idUsuario;
        this.dataHoraAlteracao = now;
    }

    /** Cadastra uma Ferramenta; toda Ferramenta nasce com status AVAILABLE (FR-3). */
    public static Tool criar(String id, String codigo, String nome, String categoria, BigDecimal valorEstimado,
            String estadoConservacao, String idUsuario, Instant now) {
        return new Tool(id, codigo, nome, categoria, valorEstimado, estadoConservacao, idUsuario, now);
    }

    /**
     * Edição parcial (PATCH): campos nulos permanecem como estão. A mudança de status é validada antes
     * de qualquer alteração: só AVAILABLE/INACTIVE podem ser definidos manualmente e uma Ferramenta
     * emprestada não muda de status pela edição (FR-4).
     */
    public void aplicarEdicao(ToolEdit edicao, String idUsuario, Instant now) {
        if (edicao.status() != null && edicao.status() != this.status) {
            assertTransicaoManualPermitida(edicao.status());
            this.status = edicao.status();
        }
        if (edicao.codigo() != null) {
            this.codigo = edicao.codigo();
        }
        if (edicao.nome() != null) {
            this.nome = edicao.nome();
        }
        if (edicao.categoria() != null) {
            this.categoria = edicao.categoria();
        }
        if (edicao.valorEstimado() != null) {
            this.valorEstimado = edicao.valorEstimado();
        }
        if (edicao.estadoConservacao() != null) {
            this.estadoConservacao = edicao.estadoConservacao();
        }
        this.idUsuarioAlteracao = idUsuario;
        this.dataHoraAlteracao = now;
    }

    /** FR-9: só uma Ferramenta AVAILABLE pode ser retirada; o motivo da recusa traz o status atual. */
    public void assertDisponivelParaRetirada() {
        if (this.status != ToolStatus.AVAILABLE) {
            throw new ToolNotAvailableException(this.codigo, this.status);
        }
    }

    /** FR-11: a confirmação da Retirada marca a Ferramenta como emprestada. */
    public void registrarRetirada(String idUsuario, Instant now) {
        assertDisponivelParaRetirada();
        this.status = ToolStatus.ON_LOAN;
        this.idUsuarioAlteracao = idUsuario;
        this.dataHoraAlteracao = now;
    }

    private void assertTransicaoManualPermitida(ToolStatus novo) {
        if (!novo.isManuallyAssignable()) {
            throw new InvalidToolStatusTransitionException(novo);
        }
        if (this.status == ToolStatus.ON_LOAN) {
            throw new ToolStatusConflictException(this.codigo);
        }
    }

    /** Valores da edição parcial; {@code null} significa "não alterar". */
    public record ToolEdit(String codigo, String nome, String categoria, BigDecimal valorEstimado,
            String estadoConservacao, ToolStatus status) {
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

    public String getCategoria() {
        return categoria;
    }

    public BigDecimal getValorEstimado() {
        return valorEstimado;
    }

    public String getEstadoConservacao() {
        return estadoConservacao;
    }

    public ToolStatus getStatus() {
        return status;
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
