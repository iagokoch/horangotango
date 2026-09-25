package com.monitoolring.api.controller;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.monitoolring.api.support.AbstractIntegrationTest;
import com.monitoolring.api.support.JwtTestTokenFactory;

@SpringBootTest
@AutoConfigureMockMvc
class ToolControllerIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void createWithoutTokenIsRejected() throws Exception {
        mockMvc.perform(post("/api/tools")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"codigo\":\"COD-401\",\"nome\":\"Martelo\",\"quantidade\":10}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createWithValidTokenPersistsTool() throws Exception {
        String token = JwtTestTokenFactory.validTokenFor("user-abc");

        mockMvc.perform(post("/api/tools")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"codigo\":\"1LPJ89\",\"nome\":\"Martelo\",\"quantidade\":10}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.codigo").value("1LPJ89"))
                .andExpect(jsonPath("$.idUsuarioCriacao").value("user-abc"))
                .andExpect(jsonPath("$.idUsuarioAlteracao").value("user-abc"))
                .andExpect(jsonPath("$.versao").value(0));
    }

    @Test
    void createWithDuplicateCodigoIsRejected() throws Exception {
        String token = JwtTestTokenFactory.validTokenFor("user-abc");
        String body = "{\"codigo\":\"DUPLICADO\",\"nome\":\"Martelo\",\"quantidade\":10}";

        mockMvc.perform(post("/api/tools")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/tools")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("DUPLICADO")));
    }

    @Test
    void createWithMissingFieldsIsRejected() throws Exception {
        String token = JwtTestTokenFactory.validTokenFor("user-abc");

        mockMvc.perform(post("/api/tools")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"codigo\":\"\",\"nome\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateWithCorrectVersionSucceedsAndIncrementsVersion() throws Exception {
        String token = JwtTestTokenFactory.validTokenFor("user-creator");
        String createBody = "{\"codigo\":\"UPD-1\",\"nome\":\"Martelo\",\"quantidade\":10}";

        String createResponse = mockMvc.perform(post("/api/tools")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String id = com.jayway.jsonpath.JsonPath.read(createResponse, "$.id");

        String editorToken = JwtTestTokenFactory.validTokenFor("user-editor");
        mockMvc.perform(put("/api/tools/{id}", id)
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"codigo\":\"UPD-1\",\"nome\":\"Martelo Grande\",\"quantidade\":20,\"versao\":0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Martelo Grande"))
                .andExpect(jsonPath("$.quantidade").value(20))
                .andExpect(jsonPath("$.idUsuarioAlteracao").value("user-editor"))
                .andExpect(jsonPath("$.idUsuarioCriacao").value("user-creator"))
                .andExpect(jsonPath("$.versao").value(1));
    }

    @Test
    void updateWithStaleVersionIsRejectedWithConflict() throws Exception {
        String token = JwtTestTokenFactory.validTokenFor("user-abc");
        String createBody = "{\"codigo\":\"UPD-2\",\"nome\":\"Martelo\",\"quantidade\":10}";

        String createResponse = mockMvc.perform(post("/api/tools")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String id = com.jayway.jsonpath.JsonPath.read(createResponse, "$.id");

        mockMvc.perform(put("/api/tools/{id}", id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"codigo\":\"UPD-2\",\"nome\":\"Martelo\",\"quantidade\":10,\"versao\":99}"))
                .andExpect(status().isConflict());
    }

    @Test
    void updateOfUnknownIdReturnsNotFound() throws Exception {
        String token = JwtTestTokenFactory.validTokenFor("user-abc");

        mockMvc.perform(put("/api/tools/{id}", "does-not-exist")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"codigo\":\"X\",\"nome\":\"X\",\"quantidade\":1,\"versao\":0}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getEndpointsRequireToken() throws Exception {
        mockMvc.perform(get("/api/tools"))
                .andExpect(status().isUnauthorized());
    }
}
