package com.monitoolring.api.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.monitoolring.api.dto.UserCreateRequest;
import com.monitoolring.api.dto.UserResponse;
import com.monitoolring.api.mapper.UserMapper;
import com.monitoolring.api.security.CurrentUserProvider;
import com.monitoolring.api.service.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/staff")
@Tag(name = "Staff", description = "Cadastro de Responsáveis da Oficina (FR-2)")
public class StaffController {

    private final UserService userService;
    private final UserMapper userMapper;
    private final CurrentUserProvider currentUserProvider;

    public StaffController(UserService userService, UserMapper userMapper, CurrentUserProvider currentUserProvider) {
        this.userService = userService;
        this.userMapper = userMapper;
        this.currentUserProvider = currentUserProvider;
    }

    @Operation(summary = "Staff cadastra outro Staff",
            description = "Exclusivo de Staff. Mesmo corpo do autocadastro, mas cria a conta com papel STAFF. "
                    + "O primeiro Staff do sistema é criado pelo bootstrap de configuração (app.bootstrap.staff.*). "
                    + "Respostas: 201 criado, 400 corpo inválido, 401 sem token, 403 sem papel STAFF, "
                    + "409 e-mail já cadastrado.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody UserCreateRequest request) {
        String idStaff = currentUserProvider.getCurrentUserId();
        return userMapper.toResponse(userService.createStaff(request, idStaff));
    }
}
