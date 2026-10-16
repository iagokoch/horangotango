package com.monitoolring.api.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.monitoolring.api.dto.ErrorResponse;
import com.monitoolring.api.dto.LoginRequest;
import com.monitoolring.api.dto.LoginResponse;
import com.monitoolring.api.dto.UserCreateRequest;
import com.monitoolring.api.dto.UserResponse;
import com.monitoolring.api.mapper.UserMapper;
import com.monitoolring.api.service.AuthService;
import com.monitoolring.api.service.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Autenticação", description = "Autocadastro de Membro, login e logout (FR-1)")
public class AuthController {

    private final UserService userService;
    private final AuthService authService;
    private final UserMapper userMapper;

    public AuthController(UserService userService, AuthService authService, UserMapper userMapper) {
        this.userService = userService;
        this.authService = authService;
        this.userMapper = userMapper;
    }

    @Operation(summary = "Autocadastro de Membro",
            description = "Rota pública. Cria sempre uma conta com papel MEMBER — não é possível se "
                    + "autocadastrar como Staff (FR-2); um campo 'papel' no corpo é ignorado. O e-mail é "
                    + "normalizado para minúsculas e a senha (mín. 8 caracteres) é guardada apenas como hash "
                    + "BCrypt. Respostas: 201 criado, 400 corpo inválido, 409 e-mail já cadastrado.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Membro criado"),
            @ApiResponse(responseCode = "400", description = "Corpo ou parâmetro inválido",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "E-mail já cadastrado",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class)))
    })
    @SecurityRequirements
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse register(@Valid @RequestBody UserCreateRequest request) {
        return userMapper.toResponse(userService.registerMember(request));
    }

    @Operation(summary = "Login de Membro ou Staff",
            description = "Rota pública. Devolve um token JWT (tipo Bearer) com o id do usuário e o papel, "
                    + "válido até 'expiraEm' (app.jwt.expiration). Credenciais inválidas devolvem 401 com a "
                    + "mesma mensagem para e-mail inexistente e senha errada (FR-1).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Autenticado; devolve o token"),
            @ApiResponse(responseCode = "400", description = "Corpo ou parâmetro inválido",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Credenciais inválidas",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class)))
    })
    @SecurityRequirements
    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        AuthService.Session session = authService.login(request.email(), request.senha());
        return new LoginResponse(session.token().token(), LoginResponse.TIPO_BEARER,
                session.token().expiraEm(), userMapper.toResponse(session.user()));
    }

    @Operation(summary = "Logout",
            description = "Exige token válido e responde 204. A API é stateless: o logout não tem efeito no "
                    + "servidor — o cliente deve descartar o token, que continua válido até expirar. "
                    + "Revogação server-side de tokens (denylist) é pendência da N3.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Logout aceito (o token continua válido até expirar)"),
            @ApiResponse(responseCode = "401", description = "Token ausente, inválido ou expirado",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout() {
        // stateless: nada a fazer no servidor
    }
}
