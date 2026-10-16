package com.monitoolring.api.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClockConfig {

    /**
     * Relógio único da aplicação (UTC). Services que dependem de "agora" (retirada, prazo, atraso)
     * recebem este bean, para que os testes possam substituí-lo por um {@code Clock.fixed}.
     */
    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
