package com.monitoolring.api.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.monitoolring.api.domain.Tool;
import com.monitoolring.api.domain.ToolStatus;
import com.monitoolring.api.dto.ErrorResponse;
import com.monitoolring.api.dto.ToolCreateRequest;
import com.monitoolring.api.dto.ToolResponse;
import com.monitoolring.api.dto.ToolUpdateRequest;
import com.monitoolring.api.mapper.ToolMapper;
import com.monitoolring.api.security.CurrentUserProvider;
import com.monitoolring.api.service.ToolService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/tools")
@Tag(name = "Ferramentas", description = "Catálogo de Ferramentas: cadastro, edição/inativação e consulta "
        + "de disponibilidade (FR-3, FR-4, FR-5). Não existe exclusão física — a remoção é lógica, via status "
        + "INACTIVE.")
public class ToolController {

    private final ToolService toolService;
    private final ToolMapper toolMapper;
    private final CurrentUserProvider currentUserProvider;

    public ToolController(ToolService toolService, ToolMapper toolMapper, CurrentUserProvider currentUserProvider) {
        this.toolService = toolService;
        this.toolMapper = toolMapper;
        this.currentUserProvider = currentUserProvider;
    }

    @Operation(summary = "Cadastra uma nova ferramenta (Staff)",
            description = "FR-3. Exclusivo de Staff. Recebe código (identificador único), nome, categoria, "
                    + "valorEstimado (R$, > 0, até 2 casas decimais) e estadoConservacao inicial. A ferramenta "
                    + "nasce sempre com status AVAILABLE. id, auditoria e versão são gerados pelo servidor a partir "
                    + "do token JWT. Respostas: 201 criada, 400 corpo inválido, 401 sem token, 403 sem papel STAFF, "
                    + "409 código já cadastrado.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Ferramenta criada (status AVAILABLE)"),
            @ApiResponse(responseCode = "400", description = "Corpo ou parâmetro inválido",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Token ausente, inválido ou expirado",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Papel sem permissão para a operação",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Código já cadastrado",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ToolResponse create(@Valid @RequestBody ToolCreateRequest request) {
        String idUsuario = currentUserProvider.getCurrentUserId();
        Tool tool = toolService.create(request, idUsuario);
        return toolMapper.toResponse(tool);
    }

    @Operation(summary = "Edita, inativa ou reativa uma ferramenta (Staff)",
            description = "FR-4. Exclusivo de Staff. Atualização parcial: só 'versao' é obrigatória (optimistic "
                    + "lock); campos omitidos não mudam. 'status' aceita apenas INACTIVE (inativar) ou AVAILABLE "
                    + "(reativar, inclusive após reparo/inspeção ou perda — FR-15/FR-19). Respostas: 200 atualizada, "
                    + "400 corpo inválido, 401 sem token, 403 sem papel STAFF, 404 inexistente, 409 versão divergente "
                    + "/ código duplicado / ferramenta emprestada não pode mudar de status, 422 status ON_LOAN, LOST "
                    + "ou UNDER_REPAIR pedido manualmente (são definidos pelos fluxos de empréstimo).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "OK"),
            @ApiResponse(responseCode = "400", description = "Corpo ou parâmetro inválido",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Token ausente, inválido ou expirado",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Papel sem permissão para a operação",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Recurso não encontrado",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Versão desatualizada, código duplicado ou ferramenta emprestada",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "422", description = "Status ON_LOAN, LOST ou UNDER_REPAIR pedido no PATCH",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PatchMapping("/{id}")
    public ToolResponse update(@PathVariable String id, @Valid @RequestBody ToolUpdateRequest request) {
        String idUsuario = currentUserProvider.getCurrentUserId();
        Tool tool = toolService.update(id, request, idUsuario);
        return toolMapper.toResponse(tool);
    }

    @Operation(summary = "Lista o catálogo de ferramentas com status (Membro/Staff)",
            description = "FR-5. Membro e Staff. Ordenado por código; o status reflete o banco no momento da "
                    + "consulta (sem cache). Filtro opcional por status.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "OK"),
            @ApiResponse(responseCode = "400", description = "Valor inválido no filtro status",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Token ausente, inválido ou expirado",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping
    public List<ToolResponse> findAll(
            @Parameter(description = "Filtra pelo status, ex.: AVAILABLE")
            @RequestParam(required = false) ToolStatus status) {
        return toolService.findAll(status).stream()
                .map(toolMapper::toResponse)
                .toList();
    }

    @Operation(summary = "Busca uma ferramenta pelo id (Membro/Staff)",
            description = "Membro e Staff. Respostas: 200, 401 sem token, 404 inexistente.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "OK"),
            @ApiResponse(responseCode = "401", description = "Token ausente, inválido ou expirado",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Recurso não encontrado",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/{id}")
    public ToolResponse findById(@PathVariable String id) {
        return toolMapper.toResponse(toolService.findById(id));
    }
}
