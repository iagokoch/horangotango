package com.monitoolring.api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.monitoolring.api.repository.ToolRepository;
import com.monitoolring.api.support.AbstractIntegrationTest;
import com.monitoolring.api.support.JwtTestTokenFactory;

@SpringBootTest
@AutoConfigureMockMvc
class ToolCodigoConcurrencyIT extends AbstractIntegrationTest {

    private static final String STAFF = JwtTestTokenFactory.staffToken("codigo-staff");
    private static final String EDITOR = JwtTestTokenFactory.staffToken("codigo-editor");

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ObjectMapper mapper;
    @SpyBean private ToolRepository toolRepository;

    @Test
    void concurrentCreatesReturnCreatedAndConflictWithOnlyOnePersistedTool() throws Exception {
        String codigo = uniqueCodigo();
        CyclicBarrier checked = new CyclicBarrier(2);
        AtomicInteger checks = new AtomicInteger();
        // SQL remains real; only the window between precheck and write is controlled.
        doAnswer(invocation -> checkedExists(codigo, null, checked, checks))
                .when(toolRepository).existsByCodigo(codigo);

        List<MockHttpServletResponse> responses = concurrently(
                () -> create(codigo), () -> create(codigo));

        assertThat(responses).extracting(MockHttpServletResponse::getStatus)
                .containsExactlyInAnyOrder(201, 409);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM ferramentas WHERE codigo = ?",
                Integer.class, codigo)).isEqualTo(1);
        MockHttpServletResponse conflict = responses.stream().filter(r -> r.getStatus() == 409)
                .findFirst().orElseThrow();
        assertDuplicateResponse(conflict, create(codigo), codigo);
    }

    @Test
    void concurrentPatchesReturnOkAndConflictWithoutPartialChanges() throws Exception {
        String firstId = mapper.readTree(create(uniqueCodigo()).getContentAsByteArray()).path("id").asText();
        String secondId = mapper.readTree(create(uniqueCodigo()).getContentAsByteArray()).path("id").asText();
        Map<String, Object> firstBefore = row(firstId);
        Map<String, Object> secondBefore = row(secondId);
        String codigo = uniqueCodigo();
        CyclicBarrier checked = new CyclicBarrier(2);
        AtomicInteger checks = new AtomicInteger();
        for (String id : List.of(firstId, secondId)) {
            doAnswer(invocation -> checkedExists(codigo, invocation.getArgument(1), checked, checks))
                    .when(toolRepository).existsByCodigoAndIdNot(eq(codigo), eq(id));
        }

        List<MockHttpServletResponse> responses = concurrently(
                () -> update(firstId, codigo), () -> update(secondId, codigo));

        assertThat(responses).extracting(MockHttpServletResponse::getStatus)
                .containsExactlyInAnyOrder(200, 409);
        int winner = responses.get(0).getStatus() == 200 ? 0 : 1;
        String winnerId = List.of(firstId, secondId).get(winner);
        String loserId = List.of(firstId, secondId).get(1 - winner);
        assertThat(row(loserId)).isEqualTo(winner == 0 ? secondBefore : firstBefore);
        assertThat(row(winnerId)).containsEntry("codigo", codigo)
                .containsEntry("nome", "Nome editado").containsEntry("status", "INACTIVE")
                .containsEntry("id_usuario_alteracao", "codigo-editor").containsEntry("versao", 1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM ferramentas WHERE codigo = ?",
                Integer.class, codigo)).isEqualTo(1);
        assertDuplicateResponse(responses.get(1 - winner), update(loserId, codigo), codigo);
        assertThat(row(loserId)).isEqualTo(winner == 0 ? secondBefore : firstBefore);
    }

    private boolean checkedExists(String codigo, String excludedId, CyclicBarrier checked,
            AtomicInteger checks) throws Exception {
        boolean exists = excludedId == null
                ? Boolean.TRUE.equals(jdbc.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM ferramentas WHERE codigo = ?)", Boolean.class, codigo))
                : Boolean.TRUE.equals(jdbc.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM ferramentas WHERE codigo = ? AND id <> ?)",
                        Boolean.class, codigo, excludedId));
        if (checks.getAndIncrement() < 2) {
            assertThat(exists).isFalse();
            checked.await(15, TimeUnit.SECONDS);
        }
        return exists;
    }

    private List<MockHttpServletResponse> concurrently(Callable<MockHttpServletResponse> first,
            Callable<MockHttpServletResponse> second) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<MockHttpServletResponse> a = executor.submit(first);
            Future<MockHttpServletResponse> b = executor.submit(second);
            return List.of(a.get(30, TimeUnit.SECONDS), b.get(30, TimeUnit.SECONDS));
        } finally {
            executor.shutdownNow();
            assertThat(executor.awaitTermination(10, TimeUnit.SECONDS)).isTrue();
        }
    }

    private void assertDuplicateResponse(MockHttpServletResponse concurrent,
            MockHttpServletResponse sequential, String codigo) throws Exception {
        assertThat(sequential.getStatus()).isEqualTo(409);
        JsonNode actual = mapper.readTree(concurrent.getContentAsByteArray());
        JsonNode expected = mapper.readTree(sequential.getContentAsByteArray());
        assertThat(actual.path("status").asInt()).isEqualTo(409);
        assertThat(actual.path("error").asText()).isEqualTo("Conflict");
        assertThat(actual.path("message").asText())
                .isEqualTo("Já existe uma ferramenta cadastrada com o código '" + codigo + "'.")
                .isEqualTo(expected.path("message").asText());
        assertThat(actual.path("timestamp").asText()).isNotBlank();
    }

    private Map<String, Object> row(String id) {
        return jdbc.queryForMap("SELECT * FROM ferramentas WHERE id = ?", id);
    }

    private MockHttpServletResponse create(String codigo) throws Exception {
        return mockMvc.perform(post("/api/tools").header("Authorization", "Bearer " + STAFF)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("codigo", codigo, "nome", "Ferramenta",
                        "categoria", "Teste", "valorEstimado", 10, "estadoConservacao", "Nova"))))
                .andReturn().getResponse();
    }

    private MockHttpServletResponse update(String id, String codigo) throws Exception {
        return mockMvc.perform(patch("/api/tools/{id}", id).header("Authorization", "Bearer " + EDITOR)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("codigo", codigo, "nome", "Nome editado",
                        "status", "INACTIVE", "versao", 0))))
                .andReturn().getResponse();
    }

    private static String uniqueCodigo() {
        return "C-" + UUID.randomUUID().toString().substring(0, 12);
    }
}
