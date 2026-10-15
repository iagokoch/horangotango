package com.monitoolring.api.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.monitoolring.api.support.AbstractIntegrationTest;

/**
 * Sem {@code http.cors(...)} explicito, o Spring Security so liga o CorsFilter quando existe
 * exatamente um bean {@link CorsConfigurationSource} no contexto (hoje, o
 * {@code mvcHandlerMappingIntrospector}). Este teste garante que o preflight continua funcionando
 * mesmo que outro bean desse tipo seja registrado.
 */
@SpringBootTest
@AutoConfigureMockMvc
class CorsWithExtraCorsSourceIT extends AbstractIntegrationTest {

    @TestConfiguration
    static class ExtraCorsSourceConfig {
        @Bean
        CorsConfigurationSource outraFonteDeCors() {
            return new UrlBasedCorsConfigurationSource();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Test
    void preflightStillWorksWhenAnotherCorsConfigurationSourceExists() throws Exception {
        mockMvc.perform(options("/api/tools")
                        .header(HttpHeaders.ORIGIN, "http://localhost:3000")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:3000"));
    }
}
