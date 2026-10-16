package com.monitoolring.api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.jayway.jsonpath.JsonPath;
import com.monitoolring.api.domain.FunctionalState;
import com.monitoolring.api.domain.LoanStatus;
import com.monitoolring.api.domain.User;
import com.monitoolring.api.dto.ChecklistRequest;
import com.monitoolring.api.dto.LoanCreateRequest;
import com.monitoolring.api.dto.ToolCreateRequest;
import com.monitoolring.api.dto.UserCreateRequest;
import com.monitoolring.api.exception.ToolNotAvailableException;
import com.monitoolring.api.repository.LoanRepository;
import com.monitoolring.api.service.LoanService;
import com.monitoolring.api.service.ReturnDeadlineService;
import com.monitoolring.api.service.ToolService;
import com.monitoolring.api.service.UserService;
import com.monitoolring.api.support.AbstractIntegrationTest;
import com.monitoolring.api.support.JwtTestTokenFactory;

@SpringBootTest
@AutoConfigureMockMvc
class LoanControllerIT extends AbstractIntegrationTest {

    private static final String CHECKLIST_OK = "{\"estadoFuncional\":\"INTACT\",\"avariasVisiveis\":\"Sem avarias\","
            + "\"acessoriosInclusos\":[\"Maleta\",\"Broca 8mm\"]}";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private UserService userService;

    @Autowired
    private ToolService toolService;

    @Autowired
    private ReturnDeadlineService returnDeadlineService;

    @Autowired
    private LoanService loanService;

    @Autowired
    private LoanRepository loanRepository;

    private User staff;
    private User membro;
    private String staffToken;
    private String membroToken;
    private String toolId;

    @BeforeEach
    void setUp() {
        staff = userService.createStaff(new UserCreateRequest("Bruno Staff", uniqueEmail("staff"), "senha-forte-1"),
                "bootstrap");
        membro = userService.registerMember(new UserCreateRequest("Marcos", uniqueEmail("membro"), "senha-forte-1"));
        staffToken = JwtTestTokenFactory.staffToken(staff.getId());
        membroToken = JwtTestTokenFactory.memberToken(membro.getId());
        // banco compartilhado: outro IT pode ter apagado ou mudado o prazo
        returnDeadlineService.define(7, staff.getId());
        toolId = newTool();
    }

    // ---------- POST /api/loans: sucesso ----------

    @Test
    void checkoutCreatesLoanWithDeadlineAndChecklistAndMarksToolOnLoan() throws Exception {
        String response = checkout(staffToken, body(toolId, membro.getId(), CHECKLIST_OK))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(notNullValue()))
                .andExpect(jsonPath("$.ferramentaId").value(toolId))
                .andExpect(jsonPath("$.membroId").value(membro.getId()))
                .andExpect(jsonPath("$.staffRetiradaId").value(staff.getId()))
                .andExpect(jsonPath("$.diasPrazo").value(7))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.checklistRetirada.tipo").value("CHECKOUT"))
                .andExpect(jsonPath("$.checklistRetirada.estadoFuncional").value("INTACT"))
                .andExpect(jsonPath("$.checklistRetirada.avariasVisiveis").value("Sem avarias"))
                .andExpect(jsonPath("$.checklistRetirada.acessoriosInclusos[0]").value("Maleta"))
                .andExpect(jsonPath("$.checklistRetirada.acessoriosInclusos[1]").value("Broca 8mm"))
                .andExpect(jsonPath("$.checklistRetirada.idUsuarioRegistro").value(staff.getId()))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        Instant retirada = Instant.parse(JsonPath.read(response, "$.dataHoraRetirada"));
        Instant prazo = Instant.parse(JsonPath.read(response, "$.prazoDevolucao"));
        assertThat(Duration.between(retirada, prazo)).isEqualTo(Duration.ofDays(7));
        assertThat(retirada).isBetween(Instant.now().minusSeconds(60), Instant.now());

        mockMvc.perform(get("/api/tools/{id}", toolId).header("Authorization", "Bearer " + membroToken))
                .andExpect(jsonPath("$.status").value("ON_LOAN"));

        // GET devolve exatamente o que foi gravado
        String loanId = JsonPath.read(response, "$.id");
        String fetched = getLoan(staffToken, loanId)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(JsonPath.<String>read(fetched, "$.prazoDevolucao")).isEqualTo(JsonPath.read(response, "$.prazoDevolucao"));
        assertThat(JsonPath.<String>read(fetched, "$.dataHoraRetirada"))
                .isEqualTo(JsonPath.read(response, "$.dataHoraRetirada"));
    }

    @Test
    void changingDefaultDeadlineOnlyAffectsNewCheckouts() throws Exception {
        String firstLoanId = checkoutAndGetId(toolId, membro);

        returnDeadlineService.define(30, staff.getId());
        String secondTool = newTool();
        User outroMembro = userService.registerMember(
                new UserCreateRequest("Renata", uniqueEmail("renata"), "senha-forte-1"));
        String secondLoanId = checkoutAndGetId(secondTool, outroMembro);

        getLoan(staffToken, firstLoanId).andExpect(jsonPath("$.diasPrazo").value(7));
        getLoan(staffToken, secondLoanId).andExpect(jsonPath("$.diasPrazo").value(30));
    }

    // ---------- POST /api/loans: recusas ----------

    @Test
    void checkoutWithoutChecklistIsUnprocessable() throws Exception {
        checkout(staffToken, "{\"ferramentaId\":\"" + toolId + "\",\"membroId\":\"" + membro.getId() + "\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422))
                .andExpect(jsonPath("$.details", hasItem("checklist: obrigatório")));

        assertToolStatus(toolId, "AVAILABLE");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{\"avariasVisiveis\":\"Sem avarias\",\"acessoriosInclusos\":[\"Maleta\"]}",
            "{\"estadoFuncional\":\"INTACT\",\"avariasVisiveis\":\"\",\"acessoriosInclusos\":[\"Maleta\"]}",
            "{\"estadoFuncional\":\"INTACT\",\"avariasVisiveis\":\"   \",\"acessoriosInclusos\":[\"Maleta\"]}",
            "{\"estadoFuncional\":\"INTACT\",\"avariasVisiveis\":\"Sem avarias\",\"acessoriosInclusos\":[]}",
            "{\"estadoFuncional\":\"INTACT\",\"avariasVisiveis\":\"Sem avarias\"}",
            "{\"estadoFuncional\":\"INTACT\",\"avariasVisiveis\":\"Sem avarias\",\"acessoriosInclusos\":[\" \"]}",
            "{}"})
    void checkoutWithBlankChecklistFieldIsUnprocessable(String checklist) throws Exception {
        checkout(staffToken, body(toolId, membro.getId(), checklist))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.details", hasItem(startsWith("checklist."))));

        assertToolStatus(toolId, "AVAILABLE");
    }

    @Test
    void blankChecklistReportsEveryMissingField() throws Exception {
        checkout(staffToken, body(toolId, membro.getId(), "{}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.details", hasSize(3)));
    }

    @Test
    void malformedOrOutOfFormatBodyIsBadRequest() throws Exception {
        checkout(staffToken, body(toolId, membro.getId(),
                "{\"estadoFuncional\":\"QUEBRADA\",\"avariasVisiveis\":\"x\",\"acessoriosInclusos\":[\"x\"]}"))
                .andExpect(status().isBadRequest());
        checkout(staffToken, "{\"membroId\":\"" + membro.getId() + "\",\"checklist\":" + CHECKLIST_OK + "}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details", hasItem(startsWith("ferramentaId:"))));
        checkout(staffToken, body(toolId, membro.getId(), "{\"estadoFuncional\":\"INTACT\",\"avariasVisiveis\":\""
                + "x".repeat(2001) + "\",\"acessoriosInclusos\":[\"x\"]}"))
                .andExpect(status().isBadRequest());
        checkout(staffToken, "{nao e json")
                .andExpect(status().isBadRequest());
    }

    @Test
    void unknownToolOrMemberIsNotFound() throws Exception {
        checkout(staffToken, body("ferramenta-inexistente", membro.getId(), CHECKLIST_OK))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", containsString("ferramenta-inexistente")));
        checkout(staffToken, body(toolId, "membro-inexistente", CHECKLIST_OK))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", containsString("membro-inexistente")));
    }

    @Test
    void staffAsBorrowerIsUnprocessable() throws Exception {
        checkout(staffToken, body(toolId, staff.getId(), CHECKLIST_OK))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message", containsString("Staff")));

        assertToolStatus(toolId, "AVAILABLE");
    }

    @Test
    void toolAlreadyOnLoanIsConflictNamingStatus() throws Exception {
        checkoutAndGetId(toolId, membro);
        User outroMembro = userService.registerMember(
                new UserCreateRequest("Renata", uniqueEmail("renata"), "senha-forte-1"));

        checkout(staffToken, body(toolId, outroMembro.getId(), CHECKLIST_OK))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("ON_LOAN")))
                .andExpect(jsonPath("$.message", containsString("emprestada")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"UNDER_REPAIR", "LOST", "INACTIVE"})
    void unavailableToolIsConflictNamingStatus(String toolStatus) throws Exception {
        // UNDER_REPAIR/LOST só nascem dos fluxos de devolução/perda (rodada 3): simulados no banco
        jdbcTemplate.update("UPDATE ferramentas SET status = ? WHERE id = ?", toolStatus, toolId);

        checkout(staffToken, body(toolId, membro.getId(), CHECKLIST_OK))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString(toolStatus)));
    }

    @Test
    void deadlineNotConfiguredIsConflict() throws Exception {
        jdbcTemplate.update("DELETE FROM configuracao_prazo_devolucao");

        checkout(staffToken, body(toolId, membro.getId(), CHECKLIST_OK))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("prazo padrão de devolução")));

        assertToolStatus(toolId, "AVAILABLE");
    }

    @Test
    void onlyStaffCanCheckout() throws Exception {
        checkout(membroToken, body(toolId, membro.getId(), CHECKLIST_OK))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/loans").contentType(MediaType.APPLICATION_JSON)
                        .content(body(toolId, membro.getId(), CHECKLIST_OK)))
                .andExpect(status().isUnauthorized());
    }

    // ---------- GET /api/loans/{id} ----------

    @Test
    void memberSeesOwnLoanButNotOthers() throws Exception {
        String loanId = checkoutAndGetId(toolId, membro);
        String outroMembroToken = JwtTestTokenFactory.memberToken("outro-membro");

        getLoan(membroToken, loanId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.prazoDevolucao").value(notNullValue()))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.checklistRetirada.estadoFuncional").value("INTACT"));
        getLoan(outroMembroToken, loanId)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
        getLoan(JwtTestTokenFactory.staffToken("qualquer-staff"), loanId)
                .andExpect(status().isOk());
    }

    @Test
    void unknownLoanIsNotFoundAndTokenIsRequired() throws Exception {
        getLoan(staffToken, "nao-existe").andExpect(status().isNotFound());
        mockMvc.perform(get("/api/loans/{id}", "nao-existe")).andExpect(status().isUnauthorized());
    }

    // ---------- FR-4 com empréstimo real ----------

    @Test
    void toolWithActiveLoanCannotBeInactivated() throws Exception {
        checkoutAndGetId(toolId, membro);
        int versao = jdbcTemplate.queryForObject("SELECT versao FROM ferramentas WHERE id = ?", Integer.class, toolId);

        mockMvc.perform(patch("/api/tools/{id}", toolId)
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"INACTIVE\",\"versao\":" + versao + "}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("emprestada")));

        assertToolStatus(toolId, "ON_LOAN");
    }

    // ---------- Concorrência (§5) ----------

    @Test
    void concurrentCheckoutsOfSameToolLetOnlyOneThrough() throws Exception {
        User outroMembro = userService.registerMember(
                new UserCreateRequest("Renata", uniqueEmail("renata"), "senha-forte-1"));
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            List<Future<String>> results = new ArrayList<>();
            for (User borrower : List.of(membro, outroMembro)) {
                Callable<String> attempt = () -> {
                    start.await();
                    try {
                        loanService.checkout(new LoanCreateRequest(toolId, borrower.getId(), checklistOk()),
                                staff.getId());
                        return "OK";
                    } catch (ToolNotAvailableException ex) {
                        return "CONFLICT";
                    }
                };
                results.add(executor.submit(attempt));
            }
            start.countDown();

            List<String> outcomes = new ArrayList<>();
            for (Future<String> result : results) {
                outcomes.add(result.get(30, TimeUnit.SECONDS));
            }
            assertThat(outcomes).containsExactlyInAnyOrder("OK", "CONFLICT");
        } finally {
            executor.shutdownNow();
        }
        assertThat(loanRepository.countByIdFerramentaAndStatus(toolId, LoanStatus.ACTIVE)).isEqualTo(1);
    }

    @Test
    void databaseRejectsSecondActiveLoanForSameTool() throws Exception {
        String loanId = checkoutAndGetId(toolId, membro);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO emprestimos (id, id_ferramenta, id_membro, id_staff_retirada, data_hora_retirada, "
                        + "dias_prazo, prazo_devolucao, status) "
                        + "SELECT ?, id_ferramenta, id_membro, id_staff_retirada, data_hora_retirada, dias_prazo, "
                        + "prazo_devolucao, 'ACTIVE' FROM emprestimos WHERE id = ?",
                UUID.randomUUID().toString(), loanId))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("uq_emprestimos_ferramenta_ativo");
    }

    // ---------- helpers ----------

    private static ChecklistRequest checklistOk() {
        return new ChecklistRequest(FunctionalState.INTACT, "Sem avarias", List.of("Maleta"));
    }

    private static String uniqueEmail(String prefix) {
        return prefix + "." + UUID.randomUUID() + "@example.com";
    }

    private String newTool() {
        String codigo = "L-" + UUID.randomUUID().toString().substring(0, 12);
        return toolService.create(new ToolCreateRequest(codigo, "Furadeira de impacto", "Elétricas",
                new BigDecimal("350.00"), "Nova"), staff.getId()).getId();
    }

    private static String body(String ferramentaId, String membroId, String checklistJson) {
        return "{\"ferramentaId\":\"" + ferramentaId + "\",\"membroId\":\"" + membroId + "\",\"checklist\":"
                + checklistJson + "}";
    }

    private String checkoutAndGetId(String ferramentaId, User borrower) throws Exception {
        String response = checkout(staffToken, body(ferramentaId, borrower.getId(), CHECKLIST_OK))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return JsonPath.read(response, "$.id");
    }

    private ResultActions checkout(String token, String body) throws Exception {
        return mockMvc.perform(post("/api/loans")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private ResultActions getLoan(String token, String id) throws Exception {
        return mockMvc.perform(get("/api/loans/{id}", id).header("Authorization", "Bearer " + token));
    }

    private void assertToolStatus(String id, String expected) {
        assertThat(jdbcTemplate.queryForObject("SELECT status FROM ferramentas WHERE id = ?", String.class, id))
                .isEqualTo(expected);
    }
}
