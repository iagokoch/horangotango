package com.monitoolring.api.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;

import com.monitoolring.api.domain.Tool;
import com.monitoolring.api.dto.ToolCreateRequest;
import com.monitoolring.api.dto.ToolUpdateRequest;
import com.monitoolring.api.exception.DuplicateToolCodigoException;
import com.monitoolring.api.exception.ToolNotFoundException;
import com.monitoolring.api.exception.ToolVersionConflictException;
import com.monitoolring.api.repository.ToolRepository;

@Service
public class ToolService {

    private final ToolRepository toolRepository;

    public ToolService(ToolRepository toolRepository) {
        this.toolRepository = toolRepository;
    }

    public Tool create(ToolCreateRequest request, String idUsuario) {
        assertCodigoAvailable(request.codigo());

        Instant now = Instant.now();
        Tool tool = Tool.criar(UUID.randomUUID().toString(), request.codigo(), request.nome(),
                request.quantidade(), idUsuario, now);
        return toolRepository.save(tool);
    }

    public List<Tool> findAll() {
        return toolRepository.findAll();
    }

    public Tool findById(String id) {
        return toolRepository.findById(id)
                .orElseThrow(() -> new ToolNotFoundException(id));
    }

    public Tool update(String id, ToolUpdateRequest request, String idUsuario) {
        Tool tool = findById(id);
        assertVersionMatches(tool, request.versao());
        assertCodigoAvailableForOtherTool(request.codigo(), id);

        tool.aplicarEdicao(request.codigo(), request.nome(), request.quantidade(), idUsuario, Instant.now());
        try {
            return toolRepository.saveAndFlush(tool);
        } catch (OptimisticLockingFailureException ex) {
            throw new ToolVersionConflictException(id, request.versao(), tool.getVersao());
        }
    }

    public void delete(String id) {
        Tool tool = findById(id);
        toolRepository.delete(tool);
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
