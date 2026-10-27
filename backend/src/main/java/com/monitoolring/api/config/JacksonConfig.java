package com.monitoolring.api.config;

import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.databind.DeserializationFeature;

@Configuration
public class JacksonConfig {

    /**
     * Recusa números JSON decimais em campos inteiros, incluindo 1.0 e notação exponencial.
     * Evita truncar dias/versao (issue #29), preservando decimais em campos como valorEstimado.
     */
    @Bean
    public Jackson2ObjectMapperBuilderCustomizer rejectFloatToIntegerCoercion() {
        return builder -> builder.featuresToDisable(DeserializationFeature.ACCEPT_FLOAT_AS_INT);
    }
}
