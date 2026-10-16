package com.monitoolring.api.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.monitoolring.api.dto.LoanCreateRequest;
import com.monitoolring.api.dto.LoanResponse;
import com.monitoolring.api.mapper.LoanMapper;
import com.monitoolring.api.security.CurrentUserProvider;
import com.monitoolring.api.service.LoanService;
import com.monitoolring.api.service.LoanService.LoanDetails;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/loans")
@Tag(name = "Empréstimos", description = "Retirada de Ferramenta com Checklist de Conservação e Prazo de "
        + "Devolução (FR-9, FR-10, FR-11)")
public class LoanController {

    private final LoanService loanService;
    private final LoanMapper loanMapper;
    private final CurrentUserProvider currentUserProvider;

    public LoanController(LoanService loanService, LoanMapper loanMapper, CurrentUserProvider currentUserProvider) {
        this.loanService = loanService;
        this.loanMapper = loanMapper;
        this.currentUserProvider = currentUserProvider;
    }

    @Operation(summary = "Confirma a Retirada de uma Ferramenta (Staff)",
            description = "Exclusivo de Staff, que confirma no balcão. Corpo: ferramentaId, membroId e checklist "
                    + "{estadoFuncional: INTACT|DEFECTIVE, avariasVisiveis, acessoriosInclusos[]}. Todos os campos do "
                    + "checklist são obrigatórios e não podem estar em branco — 'nenhuma avaria' ou 'nenhum "
                    + "acessório' devem ser escritos (ex.: \"Sem avarias\", [\"Nenhum\"]). Ao confirmar, grava a "
                    + "data/hora da retirada, os dias do prazo padrão vigente e o prazoDevolucao (retirada + dias "
                    + "corridos), e a ferramenta passa a ON_LOAN. Respostas: 201 criado; 400 JSON malformado ou "
                    + "campo fora do formato; 401 sem token; 403 sem papel STAFF; 404 ferramenta ou membro "
                    + "inexistente; 409 prazo padrão não configurado, ou ferramenta não disponível (status atual "
                    + "na mensagem), inclusive retirada simultânea; 422 checklist ausente/incompleto (o que falta "
                    + "vem em details) ou membroId de uma conta Staff.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LoanResponse checkout(@Valid @RequestBody LoanCreateRequest request) {
        String idStaff = currentUserProvider.getCurrentUserId();
        LoanDetails details = loanService.checkout(request, idStaff);
        return loanMapper.toResponse(details.loan(), details.checklistRetirada());
    }

    @Operation(summary = "Detalha um Empréstimo (Membro próprio/Staff)",
            description = "Staff consulta qualquer Empréstimo; Membro só os próprios. Inclui prazoDevolucao, "
                    + "status e o Checklist de Retirada. Respostas: 200, 401 sem token, 403 empréstimo de outro "
                    + "Membro, 404 inexistente.")
    @GetMapping("/{id}")
    public LoanResponse findById(@PathVariable String id) {
        LoanDetails details = loanService.findById(id, currentUserProvider.getCurrentUserId(),
                currentUserProvider.getCurrentUserRole());
        return loanMapper.toResponse(details.loan(), details.checklistRetirada());
    }
}
