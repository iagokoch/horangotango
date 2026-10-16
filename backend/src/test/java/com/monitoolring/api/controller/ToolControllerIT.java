package com.monitoolring.api.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
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
import com.monitoolring.api.domain.UserRole;
import com.monitoolring.api.support.AbstractIntegrationTest;
import com.monitoolring.api.support.JwtTestTokenFactory;

@SpringBootTest
@AutoConfigureMockMvc
class ToolControllerIT extends AbstractIntegrationTest {

    private static final String STAFF = JwtTestTokenFactory.staffToken("staff-abc");
    private static final String MEMBER = JwtTestTokenFactory.memberToken("member-abc");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // ---------- POST /api/tools ----------

    @Test
    void createWithoutTokenIsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/tools")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody(uniqueCodigo())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createAsStaffReturnsCreatedAvailableTool() throws Exception {
        String codigo = uniqueCodigo();

        createTool(STAFF, createBody(codigo))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.codigo").value(codigo))
                .andExpect(jsonPath("$.nome").value("Furadeira de impacto"))
                .andExpect(jsonPath("$.categoria").value("Elétricas"))
                .andExpect(jsonPath("$.valorEstimado").value(350.5))
                .andExpect(jsonPath("$.estadoConservacao").value("Nova, sem avarias"))
                .andExpect(jsonPath("$.status").value("AVAILABLE"))
                .andExpect(jsonPath("$.quantidade").doesNotExist())
                .andExpect(jsonPath("$.idUsuarioCriacao").value("staff-abc"))
                .andExpect(jsonPath("$.idUsuarioAlteracao").value("staff-abc"))
                .andExpect(jsonPath("$.versao").value(0));
    }

    @Test
    void createIgnoresStatusSentInBody() throws Exception {
        String body = "{\"codigo\":\"" + uniqueCodigo() + "\",\"nome\":\"Serra\",\"categoria\":\"Corte\","
                + "\"valorEstimado\":10,\"estadoConservacao\":\"Usada\",\"status\":\"INACTIVE\"}";

        createTool(STAFF, body)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("AVAILABLE"));
    }

    @Test
    void createAsMemberIsForbidden() throws Exception {
        createTool(MEMBER, createBody(uniqueCodigo()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "0.001"})
    void createWithInvalidValorEstimadoIsBadRequest(String valor) throws Exception {
        String body = "{\"codigo\":\"" + uniqueCodigo() + "\",\"nome\":\"Serra\",\"categoria\":\"Corte\","
                + "\"valorEstimado\":" + valor + ",\"estadoConservacao\":\"Usada\"}";

        createTool(STAFF, body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details", hasItem(startsWith("valorEstimado:"))));
    }

    @Test
    void createWithMissingFieldsIsBadRequest() throws Exception {
        createTool(STAFF, "{\"codigo\":\"\",\"nome\":\"\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details", hasItem(startsWith("categoria:"))))
                .andExpect(jsonPath("$.details", hasItem(startsWith("valorEstimado:"))))
                .andExpect(jsonPath("$.details", hasItem(startsWith("estadoConservacao:"))));
    }

    @Test
    void createWithDuplicateCodigoIsConflict() throws Exception {
        String codigo = uniqueCodigo();

        createTool(STAFF, createBody(codigo)).andExpect(status().isCreated());

        createTool(STAFF, createBody(codigo))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value(containsString(codigo)));
    }

    // ---------- PATCH /api/tools/{id} ----------

    @Test
    void patchWithCorrectVersionUpdatesGivenFieldsAndIncrementsVersion() throws Exception {
        String codigo = uniqueCodigo();
        String id = createAndGetId(codigo);
        String editor = JwtTestTokenFactory.staffToken("staff-editor");

        patchTool(editor, id, "{\"nome\":\"Furadeira Grande\",\"valorEstimado\":400,\"versao\":0}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Furadeira Grande"))
                .andExpect(jsonPath("$.valorEstimado").value(400))
                .andExpect(jsonPath("$.codigo").value(codigo))
                .andExpect(jsonPath("$.categoria").value("Elétricas"))
                .andExpect(jsonPath("$.status").value("AVAILABLE"))
                .andExpect(jsonPath("$.idUsuarioAlteracao").value("staff-editor"))
                .andExpect(jsonPath("$.idUsuarioCriacao").value("staff-abc"))
                .andExpect(jsonPath("$.versao").value(1));
    }

    @Test
    void patchWithStaleVersionIsConflict() throws Exception {
        String id = createAndGetId(uniqueCodigo());

        patchTool(STAFF, id, "{\"nome\":\"A\",\"versao\":0}").andExpect(status().isOk());

        patchTool(STAFF, id, "{\"nome\":\"B\",\"versao\":0}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void patchWithoutVersaoIsBadRequest() throws Exception {
        String id = createAndGetId(uniqueCodigo());

        patchTool(STAFF, id, "{\"nome\":\"Sem versao\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details", hasItem(startsWith("versao:"))));
    }

    @Test
    void patchWithBlankFieldOrInvalidStatusIsBadRequest() throws Exception {
        String id = createAndGetId(uniqueCodigo());

        patchTool(STAFF, id, "{\"nome\":\"   \",\"versao\":0}")
                .andExpect(status().isBadRequest());
        patchTool(STAFF, id, "{\"status\":\"QUEBRADA\",\"versao\":0}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void patchToCodigoOfAnotherToolIsConflict() throws Exception {
        String codigoExistente = uniqueCodigo();
        createAndGetId(codigoExistente);
        String id = createAndGetId(uniqueCodigo());

        patchTool(STAFF, id, "{\"codigo\":\"" + codigoExistente + "\",\"versao\":0}")
                .andExpect(status().isConflict());
    }

    @Test
    void staffCanInactivateAndReactivateTool() throws Exception {
        String id = createAndGetId(uniqueCodigo());

        patchTool(STAFF, id, "{\"status\":\"INACTIVE\",\"versao\":0}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INACTIVE"))
                .andExpect(jsonPath("$.versao").value(1));

        mockMvc.perform(get("/api/tools").param("status", "AVAILABLE").header("Authorization", "Bearer " + MEMBER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", not(hasItem(id))))
                .andExpect(jsonPath("$[*].status", everyItem(is("AVAILABLE"))));

        patchTool(STAFF, id, "{\"status\":\"AVAILABLE\",\"versao\":1}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AVAILABLE"))
                .andExpect(jsonPath("$.versao").value(2));
    }

    @ParameterizedTest
    @ValueSource(strings = {"ON_LOAN", "LOST", "UNDER_REPAIR"})
    void patchToStatusReservedForLoanFlowsIsUnprocessable(String requested) throws Exception {
        String id = createAndGetId(uniqueCodigo());

        patchTool(STAFF, id, "{\"status\":\"" + requested + "\",\"versao\":0}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422));

        getTool(STAFF, id).andExpect(jsonPath("$.status").value("AVAILABLE"));
    }

    @Test
    void toolOnLoanCannotBeInactivated() throws Exception {
        String id = createAndGetId(uniqueCodigo());
        // o fluxo de Retirada ainda não existe: simula um Empréstimo ativo direto no banco
        jdbcTemplate.update("UPDATE ferramentas SET status = 'ON_LOAN' WHERE id = ?", id);

        patchTool(STAFF, id, "{\"status\":\"INACTIVE\",\"versao\":0}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));

        getTool(STAFF, id).andExpect(jsonPath("$.status").value("ON_LOAN"));
    }

    @Test
    void patchOfUnknownIdIsNotFound() throws Exception {
        patchTool(STAFF, "does-not-exist", "{\"nome\":\"X\",\"versao\":0}")
                .andExpect(status().isNotFound());
    }

    @Test
    void patchAsMemberIsForbidden() throws Exception {
        String id = createAndGetId(uniqueCodigo());

        patchTool(MEMBER, id, "{\"status\":\"INACTIVE\",\"versao\":0}")
                .andExpect(status().isForbidden());
    }

    @Test
    void putIsNoLongerSupported() throws Exception {
        String id = createAndGetId(uniqueCodigo());

        mockMvc.perform(put("/api/tools/{id}", id)
                        .header("Authorization", "Bearer " + STAFF)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"X\",\"versao\":0}"))
                .andExpect(status().isMethodNotAllowed());
    }

    // ---------- DELETE (removido) ----------

    @Test
    void deleteNoLongerExists() throws Exception {
        String id = createAndGetId(uniqueCodigo());

        mockMvc.perform(delete("/api/tools/{id}", id).header("Authorization", "Bearer " + STAFF))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.status").value(405));
        mockMvc.perform(delete("/api/tools/{id}", id).header("Authorization", "Bearer " + MEMBER))
                .andExpect(status().isForbidden());

        getTool(STAFF, id).andExpect(status().isOk());
    }

    // ---------- GET ----------

    @Test
    void memberCanListAndGetToolsWithStatus() throws Exception {
        String codigo = uniqueCodigo();
        String id = createAndGetId(codigo);

        mockMvc.perform(get("/api/tools").header("Authorization", "Bearer " + MEMBER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + id + "')].status", hasItem("AVAILABLE")));

        getTool(MEMBER, id)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.codigo").value(codigo))
                .andExpect(jsonPath("$.status").value("AVAILABLE"));
    }

    @Test
    void listWithInvalidStatusFilterIsBadRequest() throws Exception {
        mockMvc.perform(get("/api/tools").param("status", "QUEBRADA").header("Authorization", "Bearer " + MEMBER))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getOfUnknownIdIsNotFound() throws Exception {
        getTool(MEMBER, "does-not-exist").andExpect(status().isNotFound());
    }

    @Test
    void getEndpointsRequireToken() throws Exception {
        mockMvc.perform(get("/api/tools"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/tools/{id}", "qualquer"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void expiredTokenIsUnauthorized() throws Exception {
        String expired = JwtTestTokenFactory.expiredTokenFor("staff-abc",
                UserRole.STAFF);

        mockMvc.perform(get("/api/tools").header("Authorization", "Bearer " + expired))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenWithoutExpirationIsUnauthorized() throws Exception {
        String neverExpires = JwtTestTokenFactory.tokenWithoutExpirationFor("staff-abc", UserRole.STAFF);

        mockMvc.perform(get("/api/tools").header("Authorization", "Bearer " + neverExpires))
                .andExpect(status().isUnauthorized());
    }

    // ---------- helpers ----------

    private static String uniqueCodigo() {
        return "T-" + UUID.randomUUID().toString().substring(0, 12);
    }

    private static String createBody(String codigo) {
        return "{\"codigo\":\"" + codigo + "\",\"nome\":\"Furadeira de impacto\",\"categoria\":\"Elétricas\","
                + "\"valorEstimado\":350.50,\"estadoConservacao\":\"Nova, sem avarias\"}";
    }

    private String createAndGetId(String codigo) throws Exception {
        String response = createTool(STAFF, createBody(codigo))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return JsonPath.read(response, "$.id");
    }

    private ResultActions createTool(String token, String body) throws Exception {
        return mockMvc.perform(post("/api/tools")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private ResultActions patchTool(String token, String id, String body) throws Exception {
        return mockMvc.perform(patch("/api/tools/{id}", id)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private ResultActions getTool(String token, String id) throws Exception {
        return mockMvc.perform(get("/api/tools/{id}", id).header("Authorization", "Bearer " + token));
    }
}
