package com.monitoolring.api.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;
import com.monitoolring.api.domain.UserRole;
import com.monitoolring.api.repository.UserRepository;
import com.monitoolring.api.support.AbstractIntegrationTest;

@SpringBootTest
@AutoConfigureMockMvc
class StaffBootstrapIT extends AbstractIntegrationTest {

    private static final String BOOTSTRAP_EMAIL = "bootstrap.staff@test.local";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StaffBootstrapRunner runner;

    @Test
    void bootstrapCreatesConfiguredStaffOnlyOnce() {
        long staffBefore = countStaff();

        runner.run(new DefaultApplicationArguments());
        runner.run(new DefaultApplicationArguments());

        assertThat(userRepository.findByEmail(BOOTSTRAP_EMAIL))
                .hasValueSatisfying(user -> assertThat(user.getPapel()).isEqualTo(UserRole.STAFF));
        assertThat(userRepository.findAll().stream().filter(u -> u.getEmail().equals(BOOTSTRAP_EMAIL)))
                .hasSize(1);
        assertThat(countStaff()).isEqualTo(staffBefore);
    }

    @Test
    void bootstrapStaffCanLoginAndCreateAnotherStaff() throws Exception {
        String loginResponse = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + BOOTSTRAP_EMAIL + "\",\"senha\":\"bootstrap-senha-123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usuario.papel").value("STAFF"))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        String token = JsonPath.read(loginResponse, "$.token");

        mockMvc.perform(post("/api/staff")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Segundo Staff\",\"email\":\"segundo.staff@example.com\","
                                + "\"senha\":\"senha-forte-1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.papel").value("STAFF"));
    }

    private long countStaff() {
        return userRepository.findAll().stream().filter(u -> u.getPapel() == UserRole.STAFF).count();
    }
}
