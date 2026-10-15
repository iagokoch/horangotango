package com.monitoolring.api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.monitoolring.api.domain.User;
import com.monitoolring.api.domain.UserRole;
import com.monitoolring.api.repository.UserRepository;
import com.monitoolring.api.support.AbstractIntegrationTest;
import com.monitoolring.api.support.JwtTestTokenFactory;

@SpringBootTest
@AutoConfigureMockMvc
class StaffControllerIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Test
    void staffCreatesAnotherStaff() throws Exception {
        String token = JwtTestTokenFactory.staffToken("staff-criador");

        mockMvc.perform(createStaff("{\"nome\":\"Bruno\",\"email\":\"Bruno.Staff@example.com\",\"senha\":\"senha-forte-1\"}")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("bruno.staff@example.com"))
                .andExpect(jsonPath("$.papel").value("STAFF"))
                .andExpect(jsonPath("$.senhaHash").doesNotExist());

        User saved = userRepository.findByEmail("bruno.staff@example.com").orElseThrow();
        assertThat(saved.getPapel()).isEqualTo(UserRole.STAFF);
        assertThat(saved.getIdUsuarioCriacao()).isEqualTo("staff-criador");
    }

    @Test
    void memberIsForbiddenToCreateStaff() throws Exception {
        String token = JwtTestTokenFactory.memberToken("membro-1");

        mockMvc.perform(createStaff("{\"nome\":\"Intruso\",\"email\":\"intruso@example.com\",\"senha\":\"senha-forte-1\"}")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"));

        assertThat(userRepository.findByEmail("intruso@example.com")).isEmpty();
    }

    @Test
    void createStaffWithoutTokenIsUnauthorized() throws Exception {
        mockMvc.perform(createStaff("{\"nome\":\"Anon\",\"email\":\"anon@example.com\",\"senha\":\"senha-forte-1\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void createStaffWithDuplicateEmailIsConflict() throws Exception {
        String token = JwtTestTokenFactory.staffToken("staff-criador");
        String body = "{\"nome\":\"Carla\",\"email\":\"carla.staff@example.com\",\"senha\":\"senha-forte-1\"}";

        mockMvc.perform(createStaff(body).header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated());
        mockMvc.perform(createStaff(body).header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict());
    }

    @Test
    void createStaffWithInvalidBodyIsBadRequest() throws Exception {
        String token = JwtTestTokenFactory.staffToken("staff-criador");

        mockMvc.perform(createStaff("{\"nome\":\"Carla\",\"email\":\"carla\",\"senha\":\"123\"}")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    private MockHttpServletRequestBuilder createStaff(String body) {
        return post("/api/staff")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
    }
}
