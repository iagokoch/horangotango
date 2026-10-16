package com.monitoolring.api.domain;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Empréstimo de uma Ferramenta a um Membro, criado na Retirada confirmada por Staff (FR-9 a FR-11).
 * Os dados da Retirada são imutáveis depois de gravados (§5 Integridade e auditoria).
 */
@Entity
@Table(name = "emprestimos")
public class Loan {

    @Id
    @Column(name = "id", length = 38, nullable = false, updatable = false)
    private String id;

    @Column(name = "id_ferramenta", length = 38, nullable = false, updatable = false)
    private String idFerramenta;

    @Column(name = "id_membro", length = 38, nullable = false, updatable = false)
    private String idMembro;

    @Column(name = "id_staff_retirada", length = 38, nullable = false, updatable = false)
    private String idStaffRetirada;

    @Column(name = "data_hora_retirada", nullable = false, updatable = false)
    private Instant dataHoraRetirada;

    @Column(name = "dias_prazo", nullable = false, updatable = false)
    private int diasPrazo;

    @Column(name = "prazo_devolucao", nullable = false, updatable = false)
    private Instant prazoDevolucao;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private LoanStatus status;

    protected Loan() {
        // exigido pelo JPA
    }

    /**
     * Abre o Empréstimo na Retirada. O prazo é {@code dataHoraRetirada + diasPrazo} dias corridos
     * (múltiplos de 24h em UTC) e {@code diasPrazo} fica gravado: mudar o prazo padrão depois não
     * altera este Empréstimo (FR-8).
     */
    public static Loan registrarRetirada(String id, String idFerramenta, String idMembro, String idStaff,
            Instant dataHoraRetirada, int diasPrazo) {
        Loan loan = new Loan();
        loan.id = id;
        loan.idFerramenta = idFerramenta;
        loan.idMembro = idMembro;
        loan.idStaffRetirada = idStaff;
        loan.dataHoraRetirada = dataHoraRetirada;
        loan.diasPrazo = diasPrazo;
        loan.prazoDevolucao = dataHoraRetirada.plus(diasPrazo, ChronoUnit.DAYS);
        loan.status = LoanStatus.ACTIVE;
        return loan;
    }

    public boolean pertenceAoMembro(String idUsuario) {
        return idMembro.equals(idUsuario);
    }

    public String getId() {
        return id;
    }

    public String getIdFerramenta() {
        return idFerramenta;
    }

    public String getIdMembro() {
        return idMembro;
    }

    public String getIdStaffRetirada() {
        return idStaffRetirada;
    }

    public Instant getDataHoraRetirada() {
        return dataHoraRetirada;
    }

    public int getDiasPrazo() {
        return diasPrazo;
    }

    public Instant getPrazoDevolucao() {
        return prazoDevolucao;
    }

    public LoanStatus getStatus() {
        return status;
    }
}
