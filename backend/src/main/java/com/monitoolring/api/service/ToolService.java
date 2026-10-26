package com.monitoolring.api.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.monitoolring.api.domain.Tool;
import com.monitoolring.api.domain.ToolStatus;
import com.monitoolring.api.dto.ToolCreateRequest;
import com.monitoolring.api.dto.ToolUpdateRequest;
import com.monitoolring.api.exception.DuplicateToolCodigoException;
import com.monitoolring.api.exception.ToolNotFoundException;
import com.monitoolring.api.exception.ToolVersionConflictException;
import com.monitoolring.api.repository.ToolRepository;

@Service
public class ToolService {

    private static final Sort CATALOG_ORDER = Sort.by("codigo");

    private final ToolRepository toolRepository;

    public ToolService(ToolRepository toolRepository) {
        this.toolRepository = toolRepository;
    }

    public Tool create(ToolCreateRequest request, String idUsuario) {
        assertCodigoAvailable(request.codigo());

        Instant now = Instant.now();
        Tool tool = Tool.criar(UUID.randomUUID().toString(), request.codigo(), request.nome(),
                request.categoria(), request.valorEstimado(), request.estadoConservacao(), idUsuario, now);
        try {
            return toolRepository.save(tool);
        } catch (DataIntegrityViolationException ex) {
            throw translateCodigoConflict(ex, tool.getCodigo());
        }
    }

    /** Catálogo ordenado por código; {@code status} nulo lista todas as Ferramentas. */
    public List<Tool> findAll(ToolStatus status) {
        if (status == null) {
            return toolRepository.findAll(CATALOG_ORDER);
        }
        return toolRepository.findByStatus(status, CATALOG_ORDER);
    }

    public Tool findById(String id) {
        return toolRepository.findById(id)
                .orElseThrow(() -> new ToolNotFoundException(id));
    }

    public Tool update(String id, ToolUpdateRequest request, String idUsuario) {
        Tool tool = findById(id);
        assertVersionMatches(tool, request.versao());
        if (request.codigo() != null) {
            assertCodigoAvailableForOtherTool(request.codigo(), id);
        }

        tool.aplicarEdicao(new Tool.ToolEdit(request.codigo(), request.nome(), request.categoria(),
                request.valorEstimado(), request.estadoConservacao(), request.status()), idUsuario, Instant.now());
        try {
            return toolRepository.saveAndFlush(tool);
        } catch (OptimisticLockingFailureException ex) {
            throw new ToolVersionConflictException(id, request.versao(), tool.getVersao());
        } catch (DataIntegrityViolationException ex) {
            throw translateCodigoConflict(ex, tool.getCodigo());
        }
    }

    private RuntimeException translateCodigoConflict(DataIntegrityViolationException ex, String codigo) {
        // The precheck improves feedback, but the unique constraint arbitrates concurrent writes.
        for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException violation
                    && "uq_ferramentas_codigo".equals(violation.getConstraintName())) {
                return new DuplicateToolCodigoException(codigo);
            }
        }
        return ex;
    }

    private void assertCodigoAvailable(String codigo) {
        if (toolRepository.existsByCodigo(codigo)) {
            throw new DuplicateToolCodigoException(codigo);
        }
    }

    private void assertCodigoAvailableForOtherTool(String codigo, String id) {
        if (toolRepository.existsByCodigoAndIdNot(codigo, id)) {
            throw new DuplicateToolCodigoException(codigo);
        }
    }

    private void assertVersionMatches(Tool tool, int expectedVersion) {
        if (tool.getVersao() != expectedVersion) {
            throw new ToolVersionConflictException(tool.getId(), expectedVersion, tool.getVersao());
        }
    }
}
