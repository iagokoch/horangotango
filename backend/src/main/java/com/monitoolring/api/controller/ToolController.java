package com.monitoolring.api.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.monitoolring.api.domain.Tool;
import com.monitoolring.api.dto.ToolCreateRequest;
import com.monitoolring.api.dto.ToolResponse;
import com.monitoolring.api.dto.ToolUpdateRequest;
import com.monitoolring.api.mapper.ToolMapper;
import com.monitoolring.api.security.CurrentUserProvider;
import com.monitoolring.api.service.ToolService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/tools")
@Tag(name = "Ferramentas", description = "Cadastro e edição de ferramentas do estoque")
public class ToolController {

    private final ToolService toolService;
    private final ToolMapper toolMapper;
    private final CurrentUserProvider currentUserProvider;

    public ToolController(ToolService toolService, ToolMapper toolMapper, CurrentUserProvider currentUserProvider) {
        this.toolService = toolService;
        this.toolMapper = toolMapper;
        this.currentUserProvider = currentUserProvider;
    }

    @Operation(summary = "Cadastra uma nova ferramenta",
            description = "Grava uma ferramenta a partir de código, nome e quantidade. "
                    + "id, usuário e datas de auditoria e versão são gerados pelo servidor a partir do token JWT.")
    @PostMapping
    public ToolResponse create(@Valid @RequestBody ToolCreateRequest request) {
        String idUsuario = currentUserProvider.getCurrentUserId();
        Tool tool = toolService.create(request, idUsuario);
        return toolMapper.toResponse(tool);
    }

    @Operation(summary = "Edita uma ferramenta existente",
            description = "Atualiza código, nome e quantidade com controle de optimistic lock via campo versao.")
    @PutMapping("/{id}")
    public ToolResponse update(@PathVariable String id, @Valid @RequestBody ToolUpdateRequest request) {
        String idUsuario = currentUserProvider.getCurrentUserId();
        Tool tool = toolService.update(id, request, idUsuario);
        return toolMapper.toResponse(tool);
    }

    @Operation(summary = "Lista todas as ferramentas cadastradas")
    @GetMapping
    public List<ToolResponse> findAll() {
        return toolService.findAll().stream()
                .map(toolMapper::toResponse)
                .toList();
    }

    @Operation(summary = "Busca uma ferramenta pelo id")
    @GetMapping("/{id}")
    public ToolResponse findById(@PathVariable String id) {
        return toolMapper.toResponse(toolService.findById(id));
    }

    @Operation(summary = "Exclui uma ferramenta existente")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        toolService.delete(id);
    }
}
