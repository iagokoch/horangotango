package com.monitoolring.api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
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
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.monitoolring.api.domain.FunctionalState;
import com.monitoolring.api.domain.Loan;
import com.monitoolring.api.domain.User;
import com.monitoolring.api.dto.ChecklistRequest;
import com.monitoolring.api.dto.LoanCreateRequest;
import com.monitoolring.api.dto.LoanReturnRequest;
import com.monitoolring.api.dto.ToolCreateRequest;
import com.monitoolring.api.dto.UserCreateRequest;
import com.monitoolring.api.repository.LoanRepository;
import com.monitoolring.api.service.LoanService;
import com.monitoolring.api.service.ReturnDeadlineService;
import com.monitoolring.api.service.ToolService;
import com.monitoolring.api.service.UserService;
import com.monitoolring.api.support.AbstractIntegrationTest;
import com.monitoolring.api.support.JwtTestTokenFactory;

@SpringBootTest
@AutoConfigureMockMvc
class LoanReturnIT extends AbstractIntegrationTest {

    private static final ChecklistRequest CHECKOUT_CHECKLIST =
            new ChecklistRequest(FunctionalState.INTACT, "Sem avarias", List.of("Maleta", "Broca"));
    private static final ChecklistRequest RETURN_CHECKLIST =
            new ChecklistRequest(FunctionalState.DEFECTIVE, "Risco na carcaça", List.of("Maleta"));

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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
    private String memberToken;
    private String toolId;
    private Loan loan;

    @BeforeEach
    void setUp() {
        staff = newStaff();
        membro = userService.registerMember(new UserCreateRequest("Membro", uniqueEmail(), "senha-forte-1"));
        staffToken = JwtTestTokenFactory.staffToken(staff.getId());
        memberToken = JwtTestTokenFactory.memberToken(membro.getId());
        returnDeadlineService.define(7, staff.getId());
        toolId = toolService.create(new ToolCreateRequest("D-" + UUID.randomUUID().toString().substring(0, 12),
                "Furadeira", "Elétricas", new BigDecimal("350.00"), "Nova"), staff.getId()).getId();
        loan = loanService.checkout(new LoanCreateRequest(toolId, membro.getId(), CHECKOUT_CHECKLIST), staff.getId()).loan();
    }

    @Test
    void returnRecordsAuditAndBothChecklistsAndMakesToolAvailable() throws Exception {
        User returningStaff = newStaff();
        String returningToken = JwtTestTokenFactory.staffToken(returningStaff.getId());
        JsonNode before = responseJson(checklists(memberToken, loan.getId()).andExpect(status().isOk()));
        Instant beforeReturn = Instant.now();

        ResultActions response = returnLoan(returningToken, loan.getId(), returnBody(RETURN_CHECKLIST))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(loan.getId()))
                .andExpect(jsonPath("$.status").value("RETURNED"))
                .andExpect(jsonPath("$.staffRetiradaId").value(staff.getId()))
                .andExpect(jsonPath("$.staffDevolucaoId").value(returningStaff.getId()))
                .andExpect(jsonPath("$.dataHoraRetirada").value(loan.getDataHoraRetirada().toString()))
                .andExpect(jsonPath("$.prazoDevolucao").value(loan.getPrazoDevolucao().toString()))
                .andExpect(jsonPath("$.diasPrazo").value(7))
                .andExpect(jsonPath("$.checklistRetirada.tipo").value("CHECKOUT"))
                .andExpect(jsonPath("$.checklistRetirada.estadoFuncional").value("INTACT"))
                .andExpect(jsonPath("$.checklistDevolucao.tipo").value("RETURN"))
                .andExpect(jsonPath("$.checklistDevolucao.estadoFuncional").value("DEFECTIVE"))
                .andExpect(jsonPath("$.checklistDevolucao.idUsuarioRegistro").value(returningStaff.getId()));
        JsonNode returned = responseJson(response);
        Instant returnTime = Instant.parse(returned.get("dataHoraDevolucao").asText());
        assertThat(returnTime).isBetween(beforeReturn.minusNanos(1000), Instant.now());
        assertThat(returned.get("checklistRetirada")).isEqualTo(before.get("checklistRetirada"));
        assertThat(returned.get("checklistDevolucao").get("dataHoraRegistro").asText()).isEqualTo(returnTime.toString());

        Loan persisted = loanRepository.findById(loan.getId()).orElseThrow();
        assertThat(persisted.getDataHoraDevolucao()).isEqualTo(returnTime);
        assertThat(persisted.getIdStaffDevolucao()).isEqualTo(returningStaff.getId());
        assertToolStatus("AVAILABLE");
        assertThat(jdbcTemplate.queryForObject("SELECT id_usuario_alteracao FROM ferramentas WHERE id = ?",
                String.class, toolId)).isEqualTo(returningStaff.getId());
        assertThat(checklistCount("RETURN")).isEqualTo(1);

        JsonNode fetched = responseJson(mockMvc.perform(get("/api/loans/{id}", loan.getId())
                .header("Authorization", "Bearer " + memberToken)).andExpect(status().isOk()));
        assertThat(fetched).isEqualTo(returned);
        mockMvc.perform(get("/api/tools").param("status", "AVAILABLE")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + toolId + "')].status", hasItem("AVAILABLE")));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{}",
            "{\"checklist\":null}",
            "{\"checklist\":{}}",
            "{\"checklist\":{\"estadoFuncional\":\"INTACT\",\"avariasVisiveis\":\" \",\"acessoriosInclusos\":[\"Maleta\"]}}",
            "{\"checklist\":{\"estadoFuncional\":\"INTACT\",\"avariasVisiveis\":\"Sem avarias\",\"acessoriosInclusos\":[]}}",
            "{\"checklist\":{\"estadoFuncional\":\"INTACT\",\"avariasVisiveis\":\"Sem avarias\",\"acessoriosInclusos\":[null]}}",
            "{\"checklist\":{\"estadoFuncional\":\"INTACT\",\"avariasVisiveis\":\"Sem avarias\",\"acessoriosInclusos\":[\" \"]}}"})
    void incompleteReturnChecklistIs422AndLeavesEverythingUnchanged(String body) throws Exception {
        returnLoan(staffToken, loan.getId(), body)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422))
                .andExpect(jsonPath("$.message", containsString("Checklist de Conservação incompleto")))
                .andExpect(jsonPath("$.details").isNotEmpty());

        assertStillActive();
    }

    @Test
    void malformedOrOutOfFormatReturnIs400() throws Exception {
        returnLoan(staffToken, loan.getId(), "{invalido").andExpect(status().isBadRequest());
        returnLoan(staffToken, loan.getId(), "{\"checklist\":{\"estadoFuncional\":\"QUEBRADA\"}}")
                .andExpect(status().isBadRequest());
        returnLoan(staffToken, loan.getId(), returnBody(
                new ChecklistRequest(FunctionalState.INTACT, "x".repeat(2001), List.of("Maleta"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details[0]", containsString("checklist.avariasVisiveis")));

        assertStillActive();
    }

    @Test
    void onlyStaffCanReturn() throws Exception {
        returnLoan(memberToken, loan.getId(), returnBody(RETURN_CHECKLIST))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/loans/{id}/return", loan.getId())
                        .contentType(MediaType.APPLICATION_JSON).content(returnBody(RETURN_CHECKLIST)))
                .andExpect(status().isUnauthorized());

        assertStillActive();
    }

    @Test
    void unknownLoanIs404ForBothNewRoutes() throws Exception {
        returnLoan(staffToken, "missing", returnBody(RETURN_CHECKLIST))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
        checklists(staffToken, "missing").andExpect(status().isNotFound());
    }

    @Test
    void checklistsAreVisibleOnlyToOwnerOrStaffBeforeAndAfterReturn() throws Exception {
        String anotherMember = JwtTestTokenFactory.memberToken(UUID.randomUUID().toString());
        checklists(memberToken, loan.getId()).andExpect(status().isOk())
                .andExpect(jsonPath("$.emprestimoId").value(loan.getId()))
                .andExpect(jsonPath("$.checklistRetirada.tipo").value("CHECKOUT"))
                .andExpect(jsonPath("$.checklistDevolucao").value(nullValue()));
        checklists(anotherMember, loan.getId()).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/loans/{id}/checklists", loan.getId())).andExpect(status().isUnauthorized());

        returnLoan(staffToken, loan.getId(), returnBody(RETURN_CHECKLIST)).andExpect(status().isOk());
        for (String token : List.of(memberToken, staffToken)) {
            checklists(token, loan.getId()).andExpect(status().isOk())
                    .andExpect(jsonPath("$.checklistRetirada.tipo").value("CHECKOUT"))
                    .andExpect(jsonPath("$.checklistDevolucao.tipo").value("RETURN"));
        }
        checklists(anotherMember, loan.getId()).andExpect(status().isForbidden());
    }

    @Test
    void duplicateReturnIs409AndNeverOverwritesAuditOrChecklists() throws Exception {
        JsonNode firstReturn = responseJson(returnLoan(staffToken, loan.getId(), returnBody(RETURN_CHECKLIST))
                .andExpect(status().isOk()));

        returnLoan(JwtTestTokenFactory.staffToken(newStaff().getId()), loan.getId(), "{}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message", containsString(loan.getId())))
                .andExpect(jsonPath("$.message", containsString("RETURNED")));

        JsonNode fetched = responseJson(mockMvc.perform(get("/api/loans/{id}", loan.getId())
                .header("Authorization", "Bearer " + memberToken)).andExpect(status().isOk()));
        assertThat(fetched).isEqualTo(firstReturn);
        assertThat(checklistCount("RETURN")).isEqualTo(1);
        assertToolStatus("AVAILABLE");
    }

    @Test
    void lostLoanCannotBeReturned() throws Exception {
        // O registro de perda pertence à N3; o estado encerrado já é suportado pelo schema.
        jdbcTemplate.update("UPDATE emprestimos SET status = 'LOST' WHERE id = ?", loan.getId());
        jdbcTemplate.update("UPDATE ferramentas SET status = 'LOST' WHERE id = ?", toolId);

        returnLoan(staffToken, loan.getId(), returnBody(RETURN_CHECKLIST))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("LOST")));

        assertToolStatus("LOST");
        assertThat(checklistCount("RETURN")).isZero();
    }

    @Test
    void toolCanBeBorrowedAgainWithoutChangingPreviousLoanChecklists() throws Exception {
        returnLoan(staffToken, loan.getId(), returnBody(RETURN_CHECKLIST)).andExpect(status().isOk());
        JsonNode previousChecklists = responseJson(checklists(memberToken, loan.getId()).andExpect(status().isOk()));

        Loan nextLoan = loanService.checkout(new LoanCreateRequest(toolId, membro.getId(), CHECKOUT_CHECKLIST),
                staff.getId()).loan();
        assertThat(nextLoan.getId()).isNotEqualTo(loan.getId());
        returnLoan(staffToken, loan.getId(), returnBody(RETURN_CHECKLIST)).andExpect(status().isConflict());

        assertToolStatus("ON_LOAN");
        assertThat(responseJson(checklists(memberToken, loan.getId()).andExpect(status().isOk())))
                .isEqualTo(previousChecklists);
        assertThat(jdbcTemplate.queryForObject("SELECT status FROM emprestimos WHERE id = ?", String.class,
                nextLoan.getId())).isEqualTo("ACTIVE");
    }

    @Test
    void concurrentReturnsAllowExactlyOneSuccessAndOneConflict() throws Exception {
        User otherStaff = newStaff();
        int previousVersion = jdbcTemplate.queryForObject("SELECT versao FROM ferramentas WHERE id = ?",
                Integer.class, toolId);
        String body = returnBody(RETURN_CHECKLIST);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<Integer> first = executor.submit(() -> {
                start.await();
                return returnLoan(staffToken, loan.getId(), body).andReturn().getResponse().getStatus();
            });
            Future<Integer> second = executor.submit(() -> {
                start.await();
                return returnLoan(JwtTestTokenFactory.staffToken(otherStaff.getId()), loan.getId(), body)
                        .andReturn().getResponse().getStatus();
            });
            start.countDown();

            assertThat(List.of(first.get(30, TimeUnit.SECONDS), second.get(30, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(200, 409);
        } finally {
            executor.shutdownNow();
        }
        Loan returned = loanRepository.findById(loan.getId()).orElseThrow();
        assertThat(returned.getIdStaffDevolucao()).isIn(staff.getId(), otherStaff.getId());
        assertThat(checklistCount("RETURN")).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT id_usuario_registro FROM checklists "
                + "WHERE id_emprestimo = ? AND tipo = 'RETURN'", String.class, loan.getId()))
                .isEqualTo(returned.getIdStaffDevolucao());
        assertThat(jdbcTemplate.queryForObject("SELECT versao FROM ferramentas WHERE id = ?", Integer.class, toolId))
                .isEqualTo(previousVersion + 1);
        assertToolStatus("AVAILABLE");
    }

    private User newStaff() {
        return userService.createStaff(new UserCreateRequest("Staff", uniqueEmail(), "senha-forte-1"), "bootstrap");
    }

    private static String uniqueEmail() {
        return UUID.randomUUID() + "@example.com";
    }

    private String returnBody(ChecklistRequest checklist) throws Exception {
        return objectMapper.writeValueAsString(new LoanReturnRequest(checklist));
    }

    private ResultActions returnLoan(String token, String loanId, String body) throws Exception {
        return mockMvc.perform(post("/api/loans/{id}/return", loanId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions checklists(String token, String loanId) throws Exception {
        return mockMvc.perform(get("/api/loans/{id}/checklists", loanId)
                .header("Authorization", "Bearer " + token));
    }

    private JsonNode responseJson(ResultActions response) throws Exception {
        return objectMapper.readTree(response.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private long checklistCount(String type) {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM checklists WHERE id_emprestimo = ? AND tipo = ?",
                Long.class, loan.getId(), type);
    }

    private void assertToolStatus(String expected) {
        assertThat(jdbcTemplate.queryForObject("SELECT status FROM ferramentas WHERE id = ?", String.class, toolId))
                .isEqualTo(expected);
    }

    private void assertStillActive() {
        Loan unchanged = loanRepository.findById(loan.getId()).orElseThrow();
        assertThat(unchanged.getStatus().name()).isEqualTo("ACTIVE");
        assertThat(unchanged.getDataHoraDevolucao()).isNull();
        assertThat(unchanged.getIdStaffDevolucao()).isNull();
        assertToolStatus("ON_LOAN");
        assertThat(checklistCount("RETURN")).isZero();
        assertThat(checklistCount("CHECKOUT")).isEqualTo(1);
    }
}
