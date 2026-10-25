package com.monitoolring.api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.monitoolring.api.domain.User;
import com.monitoolring.api.domain.UserRole;
import com.monitoolring.api.repository.UserRepository;
import com.monitoolring.api.support.AbstractIntegrationTest;
import com.monitoolring.api.support.JwtTestTokenFactory;

@SpringBootTest
@AutoConfigureMockMvc
class PasswordSecurityIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper mapper;

    @Autowired
    private UserRepository repository;

    @ParameterizedTest
    @MethodSource("acceptedPasswords")
    void memberCanRegisterAndLoginAtPasswordBoundaries(String password) throws Exception {
        String email = uniqueEmail();
        createAccount("/api/auth/register", email, password)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.senha").doesNotExist())
                .andExpect(jsonPath("$.senhaHash").doesNotExist());

        login(email, password).andExpect(status().isOk())
                .andExpect(jsonPath("$.usuario.papel").value("MEMBER"));
    }

    @ParameterizedTest
    @MethodSource("oversizedPasswords")
    void memberRegistrationRejectsOversizedPasswordWithoutSaving(String password) throws Exception {
        String email = uniqueEmail();
        createAccount("/api/auth/register", email, password)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.details", hasItem(startsWith("senha:"))));

        assertThat(repository.findByEmail(email)).isEmpty();
    }

    @ParameterizedTest
    @MethodSource("oversizedPasswords")
    void staffCreationRejectsOversizedPasswordWithoutSaving(String password) throws Exception {
        String email = uniqueEmail();
        createAccount("/api/staff", email, password)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.details", hasItem(startsWith("senha:"))));

        assertThat(repository.findByEmail(email)).isEmpty();
    }

    @ParameterizedTest
    @MethodSource("boundaryPasswords")
    void staffCanRegisterAndLoginWith72BytePassword(String password) throws Exception {
        String email = uniqueEmail();
        createAccount("/api/staff", email, password).andExpect(status().isCreated());

        login(email, password).andExpect(status().isOk())
                .andExpect(jsonPath("$.usuario.papel").value("STAFF"));
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void legacyOversizedPasswordsAndChangedSuffixesFailLikeUnknownAccounts(UserRole role) throws Exception {
        String email = uniqueEmail();
        String originalPassword = "é".repeat(36) + "AAA";
        String differentPassword = "é".repeat(36) + "BBB";
        String legacyHash = new BCryptPasswordEncoder(4).encode(originalPassword);
        User legacyUser = User.criar(UUID.randomUUID().toString(), "Conta legada", email,
                legacyHash, role, null, Instant.now());
        repository.saveAndFlush(legacyUser);

        for (String password : new String[] { originalPassword, differentPassword }) {
            String knownFailure = login(email, password).andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401))
                    .andExpect(jsonPath("$.token").doesNotExist())
                    .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
            String unknownFailure = login(uniqueEmail(), password).andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401))
                    .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

            assertThat(mapper.readTree(knownFailure).path("message"))
                    .isEqualTo(mapper.readTree(unknownFailure).path("message"));
            assertThat(knownFailure).doesNotContain(password, legacyHash);
        }

        assertThat(repository.findByEmail(email).orElseThrow().getSenhaHash()).isEqualTo(legacyHash);
    }

    private ResultActions createAccount(String path, String email, String password) throws Exception {
        var request = post(path).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("nome", "Teste senha", "email", email, "senha", password)));
        if (path.equals("/api/staff")) {
            request.header("Authorization", "Bearer " + JwtTestTokenFactory.staffToken("staff-issue26"));
        }
        return mvc.perform(request);
    }

    private ResultActions login(String email, String password) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("email", email, "senha", password))));
    }

    private static String uniqueEmail() {
        return "issue26-" + UUID.randomUUID() + "@example.com";
    }

    static Stream<String> acceptedPasswords() {
        return Stream.of("a".repeat(8), "a".repeat(72), "é".repeat(35) + "a",
                "é".repeat(36), "\uD83D\uDE00".repeat(18));
    }

    static Stream<String> boundaryPasswords() {
        return Stream.of("a".repeat(72), "é".repeat(36));
    }

    static Stream<String> oversizedPasswords() {
        return Stream.of("a".repeat(73), "é".repeat(36) + "a",
                "\uD83D\uDE00".repeat(18) + "a", "é".repeat(36) + "AAA");
    }
}
