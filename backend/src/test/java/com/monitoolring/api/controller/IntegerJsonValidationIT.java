package com.monitoolring.api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertAll;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

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

import com.jayway.jsonpath.JsonPath;
import com.monitoolring.api.support.AbstractIntegrationTest;
import com.monitoolring.api.support.JwtTestTokenFactory;

/** Regressões HTTP da issue #29, com conferência do estado persistido após entradas inválidas. */
@SpringBootTest
@AutoConfigureMockMvc
class IntegerJsonValidationIT extends AbstractIntegrationTest {

    private static final String DEADLINE_URL = "/api/settings/return-deadline";
    private static final String CREATOR_ID = "integer-json-creator";
    private static final String EDITOR_ID = "integer-json-editor";
    private static final String CREATOR = JwtTestTokenFactory.staffToken(CREATOR_ID);
    private static final String EDITOR = JwtTestTokenFactory.staffToken(EDITOR_ID);

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbcTemplate;

    @ParameterizedTest
    @ValueSource(strings = {"1.9", "1.0", "1e0", "365.9"})
    void decimalDeadlineIsBadRequestAndPreservesEntireSetting(String dias) throws Exception {
        defineDeadline(CREATOR, "{\"dias\":7}").andExpect(status().isOk());
        Map<String, Object> before = deadlineRow();

        ResultActions response = defineDeadline(EDITOR, "{\"dias\":" + dias + "}");

        assertAll(
                () -> assertMalformedBody(response),
                () -> assertThat(deadlineRow()).isEqualTo(before));
    }

    @Test
    void decimalDeadlineDoesNotCreateUnconfiguredSetting() throws Exception {
        jdbcTemplate.update("DELETE FROM configuracao_prazo_devolucao");

        ResultActions response = defineDeadline(EDITOR, "{\"dias\":1.9}");

        assertAll(
                () -> assertMalformedBody(response),
                () -> assertThat(jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM configuracao_prazo_devolucao", Integer.class)).isZero());
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.9", "0.0", "0e0", "-0.9", "1.9"})
    void decimalVersionIsBadRequestAndPreservesEntireTool(String versao) throws Exception {
        String id = createTool();
        Map<String, Object> before = toolRow(id);

        ResultActions response = editTool(id, "{\"nome\":\"Nome alterado\",\"status\":\"INACTIVE\","
                + "\"valorEstimado\":400.75,\"versao\":" + versao + "}");

        assertAll(
                () -> assertMalformedBody(response),
                () -> assertThat(toolRow(id)).isEqualTo(before));
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 7, 365})
    void integerDeadlineIncludingBoundariesIsAccepted(int dias) throws Exception {
        defineDeadline(EDITOR, "{\"dias\":" + dias + "}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dias").value(dias))
                .andExpect(jsonPath("$.idUsuarioAlteracao").value(EDITOR_ID));

        assertThat(deadlineRow()).containsEntry("dias", dias)
                .containsEntry("id_usuario_alteracao", EDITOR_ID);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "366", "null", "\"sete\"", "2147483648"})
    void invalidDeadlineRemainsBadRequestAndPreservesSetting(String dias) throws Exception {
        defineDeadline(CREATOR, "{\"dias\":7}").andExpect(status().isOk());
        Map<String, Object> before = deadlineRow();

        defineDeadline(EDITOR, "{\"dias\":" + dias + "}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        assertThat(deadlineRow()).isEqualTo(before);
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"versao\":null}", "{\"versao\":\"zero\"}",
            "{\"versao\":2147483648}", "{\"versao\":\"0.9\"}"})
    void invalidVersionRemainsBadRequestAndPreservesTool(String body) throws Exception {
        String id = createTool();
        Map<String, Object> before = toolRow(id);

        editTool(id, body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        assertThat(toolRow(id)).isEqualTo(before);
    }

    @Test
    void integerVersionAcceptsDecimalMoneyAndStaleVersionRemainsConflict() throws Exception {
        String id = createTool();

        editTool(id, "{\"nome\":\"Nome alterado\",\"valorEstimado\":400.75,\"versao\":0}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Nome alterado"))
                .andExpect(jsonPath("$.valorEstimado").value(400.75))
                .andExpect(jsonPath("$.versao").value(1));

        Map<String, Object> afterEdit = toolRow(id);
        assertThat(afterEdit).containsEntry("versao", 1)
                .containsEntry("id_usuario_alteracao", EDITOR_ID);
        assertThat((BigDecimal) afterEdit.get("valor_estimado")).isEqualByComparingTo("400.75");

        editTool(id, "{\"nome\":\"Edicao obsoleta\",\"versao\":0}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));

        assertThat(toolRow(id)).isEqualTo(afterEdit);
    }

    private void assertMalformedBody(ResultActions response) throws Exception {
        response.andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value(
                        "Corpo da requisição malformado ou com valor de tipo inválido."))
                .andExpect(jsonPath("$.timestamp").value(notNullValue()))
                .andExpect(jsonPath("$.details").isArray());
    }

    private String createTool() throws Exception {
        String codigo = "I29-" + UUID.randomUUID().toString().substring(0, 12);
        String body = "{\"codigo\":\"" + codigo + "\",\"nome\":\"Furadeira\",\"categoria\":\"Eletricas\","
                + "\"valorEstimado\":350.50,\"estadoConservacao\":\"Nova\"}";
        String response = mockMvc.perform(post("/api/tools")
                        .header("Authorization", "Bearer " + CREATOR)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.valorEstimado").value(350.5))
                .andExpect(jsonPath("$.versao").value(0))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return JsonPath.read(response, "$.id");
    }

    private ResultActions defineDeadline(String token, String body) throws Exception {
        return mockMvc.perform(put(DEADLINE_URL)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions editTool(String id, String body) throws Exception {
        return mockMvc.perform(patch("/api/tools/{id}", id)
                .header("Authorization", "Bearer " + EDITOR)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private Map<String, Object> deadlineRow() {
        return jdbcTemplate.queryForMap("SELECT * FROM configuracao_prazo_devolucao WHERE id = 1");
    }

    private Map<String, Object> toolRow(String id) {
        return jdbcTemplate.queryForMap("SELECT * FROM ferramentas WHERE id = ?", id);
    }
}
