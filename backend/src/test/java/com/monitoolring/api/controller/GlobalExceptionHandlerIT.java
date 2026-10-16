package com.monitoolring.api.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.monitoolring.api.support.AbstractIntegrationTest;
import com.monitoolring.api.support.JwtTestTokenFactory;

@SpringBootTest
@AutoConfigureMockMvc
@Import(GlobalExceptionHandlerIT.ThrowingController.class)
class GlobalExceptionHandlerIT extends AbstractIntegrationTest {

    private static final String STAFF = "Bearer " + JwtTestTokenFactory.staffToken("staff-erros");
    private static final String MEMBER = "Bearer " + JwtTestTokenFactory.memberToken("member-erros");
    private static final String INTERNAL_DETAIL = "detalhe-interno-sigiloso";

    /** Controller só de teste: não é escaneado (classe aninhada de teste), entra apenas via @Import. */
    @RestController
    @RequestMapping("/api/test-errors")
    static class ThrowingController {

        @GetMapping("/unexpected")
        String unexpected() {
            throw new IllegalStateException(INTERNAL_DETAIL);
        }

        @GetMapping("/access-denied")
        String accessDenied() {
            throw new AccessDeniedException("negado dentro do controller");
        }

        @GetMapping("/authentication")
        String authentication() {
            throw new BadCredentialsException("credencial invalida dentro do controller");
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Test
    void unexpectedExceptionReturns500WithErrorResponseAndNoInternalDetails() throws Exception {
        mockMvc.perform(get("/api/test-errors/unexpected").header("Authorization", STAFF))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.error").value("Internal Server Error"))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.details").isEmpty())
                .andExpect(jsonPath("$.trace").doesNotExist())
                .andExpect(content().string(not(containsString(INTERNAL_DETAIL))))
                .andExpect(content().string(not(containsString("IllegalStateException"))));
    }

    // ---------- regressão: o handler genérico não pode engolir Spring Security nem erros já mapeados ----------

    @Test
    void accessDeniedThrownInsideControllerStillReturns403() throws Exception {
        mockMvc.perform(get("/api/test-errors/access-denied").header("Authorization", STAFF))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"));
    }

    @Test
    void authenticationExceptionThrownInsideControllerStillReturns401() throws Exception {
        mockMvc.perform(get("/api/test-errors/authentication").header("Authorization", STAFF))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    void missingTokenStillReturns401() throws Exception {
        mockMvc.perform(get("/api/test-errors/unexpected"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void wrongRoleStillReturns403() throws Exception {
        mockMvc.perform(post("/api/tools").header("Authorization", MEMBER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void alreadyMappedExceptionKeepsItsStatus() throws Exception {
        mockMvc.perform(get("/api/tools/{id}", "nao-existe").header("Authorization", STAFF))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void springMvcStandardExceptionKeepsItsStatus() throws Exception {
        mockMvc.perform(post("/api/tools").header("Authorization", STAFF)
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("texto"))
                .andExpect(status().isUnsupportedMediaType());
    }
}
