package com.monitoolring.api.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.monitoolring.api.service.UserService;
import com.monitoolring.api.service.UserService.StaffBootstrapResult;

/**
 * Setup inicial (FR-2): na subida da aplicação, se não existir nenhum Staff e
 * {@code app.bootstrap.staff.*} estiver configurado, cria esse primeiro Staff.
 * Idempotente — com qualquer Staff já cadastrado, não faz nada.
 */
@Component
public class StaffBootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(StaffBootstrapRunner.class);

    private final UserService userService;
    private final String nome;
    private final String email;
    private final String senha;

    public StaffBootstrapRunner(UserService userService,
            @Value("${app.bootstrap.staff.nome:}") String nome,
            @Value("${app.bootstrap.staff.email:}") String email,
            @Value("${app.bootstrap.staff.password:}") String senha) {
        this.userService = userService;
        this.nome = nome;
        this.email = email;
        this.senha = senha;
    }

    @Override
    public void run(ApplicationArguments args) {
        StaffBootstrapResult result = userService.bootstrapFirstStaff(nome, email, senha);
        switch (result) {
            case CREATED -> log.info("Bootstrap: primeiro Staff criado com o e-mail '{}'.",
                    UserService.normalizeEmail(email));
            case STAFF_ALREADY_EXISTS -> log.debug("Bootstrap: já existe Staff cadastrado; nada a fazer.");
            case NOT_CONFIGURED -> log.warn("Bootstrap: nenhum Staff cadastrado e app.bootstrap.staff.* "
                    + "não configurado — o sistema está sem Staff (FR-2).");
            case INVALID_PASSWORD -> log.warn("Bootstrap: app.bootstrap.staff.password tem menos de 8 caracteres; "
                    + "Staff inicial NÃO foi criado.");
            case EMAIL_ALREADY_IN_USE -> log.warn("Bootstrap: o e-mail '{}' já pertence a uma conta de Membro; "
                    + "Staff inicial NÃO foi criado (contas existentes nunca são promovidas automaticamente).",
                    UserService.normalizeEmail(email));
        }
    }
}
