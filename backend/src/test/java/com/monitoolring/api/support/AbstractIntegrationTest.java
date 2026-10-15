package com.monitoolring.api.support;

import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Container Postgres unico para toda a JVM de testes (padrao "singleton container").
 * Nao usar {@code @Testcontainers}/{@code @Container}: eles param o container ao fim de cada
 * classe, mas o Spring reaproveita o contexto em cache entre classes com a mesma configuracao,
 * que ficaria apontando para um container ja parado. O Ryuk remove o container ao fim da JVM.
 */
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest {

    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}
