package com.monitoolring.api.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.monitoolring.api.dto.ErrorResponse;
import com.monitoolring.api.dto.ReturnDeadlineRequest;
import com.monitoolring.api.dto.ReturnDeadlineResponse;
import com.monitoolring.api.exception.ReturnDeadlineNotConfiguredException;
import com.monitoolring.api.mapper.ReturnDeadlineMapper;
import com.monitoolring.api.security.CurrentUserProvider;
import com.monitoolring.api.service.ReturnDeadlineService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/settings/return-deadline")
@Tag(name = "Configuração", description = "Prazo padrão de devolução (FR-8) — recurso singleton, exclusivo de Staff")
public class ReturnDeadlineController {

    private final ReturnDeadlineService returnDeadlineService;
    private final ReturnDeadlineMapper returnDeadlineMapper;
    private final CurrentUserProvider currentUserProvider;

    public ReturnDeadlineController(ReturnDeadlineService returnDeadlineService,
            ReturnDeadlineMapper returnDeadlineMapper, CurrentUserProvider currentUserProvider) {
        this.returnDeadlineService = returnDeadlineService;
        this.returnDeadlineMapper = returnDeadlineMapper;
        this.currentUserProvider = currentUserProvider;
    }

    @Operation(summary = "Consulta o prazo padrão de devolução (Staff)",
            description = "Exclusivo de Staff. Enquanto nenhum Staff configurou o prazo, o recurso singleton não "
                    + "existe e a resposta é 404 com ErrorResponse explicando que é preciso configurá-lo via PUT "
                    + "(nesse estado nenhuma Retirada pode ser confirmada). Respostas: 200, 401 sem token, "
                    + "403 sem papel STAFF, 404 ainda não configurado.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação concluída",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ReturnDeadlineResponse.class))),
            @ApiResponse(responseCode = "401", description = "Token ausente, inválido ou expirado",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Papel ou dono sem permissão",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Prazo padrão ainda não configurado",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping
    public ReturnDeadlineResponse get() {
        return returnDeadlineMapper.toResponse(returnDeadlineService.getCurrent());
    }

    @Operation(summary = "Define ou substitui o prazo padrão de devolução (Staff)",
            description = "Exclusivo de Staff. Substitui o valor por inteiro: corpo {\"dias\": N}, dias corridos "
                    + "entre 1 e 365. A alteração vale só para Retiradas novas — Empréstimos já confirmados mantêm o "
                    + "prazo vigente na própria Retirada (FR-8). Respostas: 200 com o valor gravado, 400 corpo "
                    + "inválido, 401 sem token, 403 sem papel STAFF.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação concluída",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ReturnDeadlineResponse.class))),
            @ApiResponse(responseCode = "400", description = "JSON malformado ou campo fora do formato",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Token ausente, inválido ou expirado",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Papel ou dono sem permissão",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PutMapping
    public ReturnDeadlineResponse put(@Valid @RequestBody ReturnDeadlineRequest request) {
        String idUsuario = currentUserProvider.getCurrentUserId();
        return returnDeadlineMapper.toResponse(returnDeadlineService.define(request.dias(), idUsuario));
    }

    /** Aqui o recurso singleton simplesmente ainda não existe: 404 (na Retirada, o mesmo motivo vira 409). */
    @ExceptionHandler(ReturnDeadlineNotConfiguredException.class)
    public ResponseEntity<ErrorResponse> handleNotConfigured(ReturnDeadlineNotConfiguredException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorResponse.of(
                HttpStatus.NOT_FOUND.value(), "Not Found", ex.getMessage()));
    }
}
