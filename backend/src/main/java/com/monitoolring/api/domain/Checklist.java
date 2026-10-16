package com.monitoolring.api.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.Immutable;

import com.monitoolring.api.exception.IncompleteChecklistException;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

/**
 * Checklist de Conservação (Glossário, FR-10/FR-14). Imutável depois de gravado e vinculado
 * permanentemente a um Empréstimo (§5 Integridade e auditoria).
 */
@Entity
@Immutable
@Table(name = "checklists")
public class Checklist {

    @Id
    @Column(name = "id", length = 38, nullable = false, updatable = false)
    private String id;

    @Column(name = "id_emprestimo", length = 38, nullable = false, updatable = false)
    private String idEmprestimo;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", length = 20, nullable = false, updatable = false)
    private ChecklistType tipo;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_funcional", length = 20, nullable = false, updatable = false)
    private FunctionalState estadoFuncional;

    @Column(name = "avarias_visiveis", length = 2000, nullable = false, updatable = false)
    private String avariasVisiveis;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "checklist_acessorios", joinColumns = @JoinColumn(name = "id_checklist"))
    @OrderColumn(name = "ordem")
    @Column(name = "descricao", length = 255, nullable = false)
    private List<String> acessoriosInclusos = new ArrayList<>();

    @Column(name = "id_usuario_registro", length = 38, nullable = false, updatable = false)
    private String idUsuarioRegistro;

    @Column(name = "data_hora_registro", nullable = false, updatable = false)
    private Instant dataHoraRegistro;

    protected Checklist() {
        // exigido pelo JPA
    }

    /**
     * Valida os campos mínimos do Glossário — campo vazio não conta como preenchimento — e cria o
     * Checklist. Lança {@link IncompleteChecklistException} (422) listando tudo o que falta.
     */
    public static Checklist criar(String id, String idEmprestimo, ChecklistType tipo, Dados dados,
            String idUsuario, Instant now) {
        validarPreenchimento(dados);
        Checklist checklist = new Checklist();
        checklist.id = id;
        checklist.idEmprestimo = idEmprestimo;
        checklist.tipo = tipo;
        checklist.estadoFuncional = dados.estadoFuncional();
        checklist.avariasVisiveis = dados.avariasVisiveis().trim();
        checklist.acessoriosInclusos = new ArrayList<>(dados.acessoriosInclusos().stream().map(String::trim).toList());
        checklist.idUsuarioRegistro = idUsuario;
        checklist.dataHoraRegistro = now;
        return checklist;
    }

    /**
     * Regra do Glossário/FR-10: estado funcional, avarias visíveis e acessórios inclusos são obrigatórios.
     * "Nenhuma avaria" ou "nenhum acessório" precisam ser declarados por escrito (ex.: "Sem avarias",
     * "Nenhum"), para que o registro seja evidência explícita e não um campo esquecido.
     */
    public static void validarPreenchimento(Dados dados) {
        List<String> problemas = new ArrayList<>();
        if (dados == null) {
            problemas.add("checklist: obrigatório");
            throw new IncompleteChecklistException(problemas);
        }
        if (dados.estadoFuncional() == null) {
            problemas.add("checklist.estadoFuncional: obrigatório (INTACT ou DEFECTIVE)");
        }
        if (dados.avariasVisiveis() == null || dados.avariasVisiveis().isBlank()) {
            problemas.add("checklist.avariasVisiveis: obrigatório; se não houver avarias, escreva isso "
                    + "explicitamente (ex.: \"Sem avarias\")");
        }
        List<String> acessorios = dados.acessoriosInclusos();
        if (acessorios == null || acessorios.isEmpty()) {
            problemas.add("checklist.acessoriosInclusos: informe ao menos um item; se não houver acessórios, "
                    + "escreva isso explicitamente (ex.: \"Nenhum\")");
        } else if (acessorios.stream().anyMatch(item -> item == null || item.isBlank())) {
            problemas.add("checklist.acessoriosInclusos: itens não podem ser vazios");
        }
        if (!problemas.isEmpty()) {
            throw new IncompleteChecklistException(problemas);
        }
    }

    /** Dados informados pelo Staff no balcão. */
    public record Dados(FunctionalState estadoFuncional, String avariasVisiveis, List<String> acessoriosInclusos) {
    }

    public String getId() {
        return id;
    }

    public String getIdEmprestimo() {
        return idEmprestimo;
    }

    public ChecklistType getTipo() {
        return tipo;
    }

    public FunctionalState getEstadoFuncional() {
        return estadoFuncional;
    }

    public String getAvariasVisiveis() {
        return avariasVisiveis;
    }

    public List<String> getAcessoriosInclusos() {
        return List.copyOf(acessoriosInclusos);
    }

    public String getIdUsuarioRegistro() {
        return idUsuarioRegistro;
    }

    public Instant getDataHoraRegistro() {
        return dataHoraRegistro;
    }
}
