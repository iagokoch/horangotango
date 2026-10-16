package com.monitoolring.api.controller;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.monitoolring.api.support.AbstractIntegrationTest;
import com.monitoolring.api.support.JwtTestTokenFactory;

@SpringBootTest
@AutoConfigureMockMvc
class ReturnDeadlineControllerIT extends AbstractIntegrationTest {

    private static final String URL = "/api/settings/return-deadline";
    private static final String STAFF = JwtTestTokenFactory.staffToken("staff-config");
    private static final String MEMBER = JwtTestTokenFactory.memberToken("member-config");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void getBeforeConfigurationIsNotFound() throws Exception {
        // banco compartilhado entre ITs: garante o estado "nunca configurado"
        jdbcTemplate.update("DELETE FROM configuracao_prazo_devolucao");

        mockMvc.perform(get(URL).header("Authorization", "Bearer " + STAFF))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value(notNullValue()));
    }

    @Test
    void putDefinesAndReplacesDeadline() throws Exception {
        putDeadline(STAFF, "{\"dias\":7}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dias").value(7))
                .andExpect(jsonPath("$.idUsuarioAlteracao").value("staff-config"))
                .andExpect(jsonPath("$.dataHoraAlteracao").value(notNullValue()));

        String otherStaff = JwtTestTokenFactory.staffToken("staff-config-2");
        putDeadline(otherStaff, "{\"dias\":14}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dias").value(14))
                .andExpect(jsonPath("$.idUsuarioAlteracao").value("staff-config-2"));

        mockMvc.perform(get(URL).header("Authorization", "Bearer " + STAFF))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dias").value(14));
    }

    @ParameterizedTest
    @ValueSource(strings = {"{\"dias\":0}", "{\"dias\":-3}", "{\"dias\":366}", "{}", "{\"dias\":\"sete\"}"})
    void putWithInvalidDiasIsBadRequest(String body) throws Exception {
        putDeadline(STAFF, body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void putWithOutOfRangeDiasExplainsField() throws Exception {
        putDeadline(STAFF, "{\"dias\":366}")
                .andExpect(jsonPath("$.details", hasItem(startsWith("dias:"))));
    }

    @Test
    void memberIsForbidden() throws Exception {
        mockMvc.perform(get(URL).header("Authorization", "Bearer " + MEMBER))
                .andExpect(status().isForbidden());
        putDeadline(MEMBER, "{\"dias\":7}")
                .andExpect(status().isForbidden());
    }

    @Test
    void withoutTokenIsUnauthorized() throws Exception {
        mockMvc.perform(get(URL)).andExpect(status().isUnauthorized());
        mockMvc.perform(put(URL).contentType(MediaType.APPLICATION_JSON).content("{\"dias\":7}"))
                .andExpect(status().isUnauthorized());
    }

    private ResultActions putDeadline(String token, String body) throws Exception {
        return mockMvc.perform(put(URL)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }
}
