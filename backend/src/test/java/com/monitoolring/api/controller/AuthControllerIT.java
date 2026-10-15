package com.monitoolring.api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.jayway.jsonpath.JsonPath;
import com.monitoolring.api.domain.User;
import com.monitoolring.api.domain.UserRole;
import com.monitoolring.api.repository.UserRepository;
import com.monitoolring.api.support.AbstractIntegrationTest;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void registerCreatesMemberWithHashedPasswordAndNeverExposesIt() throws Exception {
        register("{\"nome\":\"Ana Souza\",\"email\":\"Ana.Souza@Example.COM\",\"senha\":\"senha-forte-1\","
                + "\"papel\":\"STAFF\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(notNullValue()))
                .andExpect(jsonPath("$.nome").value("Ana Souza"))
                .andExpect(jsonPath("$.email").value("ana.souza@example.com"))
                .andExpect(jsonPath("$.papel").value("MEMBER"))
                .andExpect(jsonPath("$.senha").doesNotExist())
                .andExpect(jsonPath("$.senhaHash").doesNotExist());

        User saved = userRepository.findByEmail("ana.souza@example.com").orElseThrow();
        assertThat(saved.getPapel()).isEqualTo(UserRole.MEMBER);
        assertThat(saved.getSenhaHash()).isNotEqualTo("senha-forte-1").startsWith("$2");
        assertThat(passwordEncoder.matches("senha-forte-1", saved.getSenhaHash())).isTrue();
        assertThat(saved.getIdUsuarioCriacao()).isEqualTo(saved.getId());
    }

    @Test
    void registerWithDuplicateEmailIsConflictIgnoringCase() throws Exception {
        register("{\"nome\":\"Bruno\",\"email\":\"bruno.dup@example.com\",\"senha\":\"senha-forte-1\"}")
                .andExpect(status().isCreated());

        register("{\"nome\":\"Outro Bruno\",\"email\":\"BRUNO.DUP@example.com\",\"senha\":\"senha-forte-2\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void registerWithInvalidFieldsIsBadRequest() throws Exception {
        register("{\"nome\":\"\",\"email\":\"nao-e-email\",\"senha\":\"curta\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details", hasItem(startsWith("nome:"))))
                .andExpect(jsonPath("$.details", hasItem(startsWith("email:"))))
                .andExpect(jsonPath("$.details", hasItem(startsWith("senha:"))));
    }

    @Test
    void loginReturnsBearerTokenThatWorksOnProtectedRoute() throws Exception {
        register("{\"nome\":\"Marcos\",\"email\":\"marcos.login@example.com\",\"senha\":\"senha-forte-1\"}")
                .andExpect(status().isCreated());

        String loginResponse = login("{\"email\":\"Marcos.Login@example.com\",\"senha\":\"senha-forte-1\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value(notNullValue()))
                .andExpect(jsonPath("$.tipo").value("Bearer"))
                .andExpect(jsonPath("$.expiraEm").value(notNullValue()))
                .andExpect(jsonPath("$.usuario.email").value("marcos.login@example.com"))
                .andExpect(jsonPath("$.usuario.papel").value("MEMBER"))
                .andExpect(jsonPath("$.usuario.senhaHash").doesNotExist())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        String token = JsonPath.read(loginResponse, "$.token");

        mockMvc.perform(get("/api/tools").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/logout").header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    @Test
    void loginFailureHasSameMessageForUnknownEmailAndWrongPassword() throws Exception {
        register("{\"nome\":\"Renata\",\"email\":\"renata.login@example.com\",\"senha\":\"senha-forte-1\"}")
                .andExpect(status().isCreated());

        String wrongPassword = login("{\"email\":\"renata.login@example.com\",\"senha\":\"senha-errada-1\"}")
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        String unknownEmail = login("{\"email\":\"ninguem@example.com\",\"senha\":\"senha-forte-1\"}")
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        String wrongPasswordMessage = JsonPath.read(wrongPassword, "$.message");
        String unknownEmailMessage = JsonPath.read(unknownEmail, "$.message");
        assertThat(wrongPasswordMessage).isEqualTo(unknownEmailMessage).isEqualTo("E-mail ou senha inválidos.");
    }

    @Test
    void loginWithBlankFieldsIsBadRequest() throws Exception {
        login("{\"email\":\"\",\"senha\":\"\"}")
                .andExpect(status().isBadRequest());
    }

    @Test
    void logoutWithoutTokenIsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    private ResultActions register(String body) throws Exception {
        return mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private ResultActions login(String body) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }
}
