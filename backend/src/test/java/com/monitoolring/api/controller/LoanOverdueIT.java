package com.monitoolring.api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.monitoolring.api.domain.FunctionalState;
import com.monitoolring.api.domain.Loan;
import com.monitoolring.api.domain.LoanStatus;
import com.monitoolring.api.domain.User;
import com.monitoolring.api.dto.ChecklistRequest;
import com.monitoolring.api.dto.LoanCreateRequest;
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
class LoanOverdueIT extends AbstractIntegrationTest {

    private static final Instant START = Instant.parse("2026-10-01T12:00:00Z");
    private static final ChecklistRequest CHECKLIST_OK =
            new ChecklistRequest(FunctionalState.INTACT, "Sem avarias", List.of("Maleta"));

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

    // Contexto próprio: o relógio controlável não afeta os demais ITs.
    @MockBean
    private Clock clock;

    private User staff;
    private User membro;
    private String staffToken;

    @BeforeEach
    void setUp() {
        at(START);
        staff = userService.createStaff(new UserCreateRequest("Staff", uniqueEmail(), "senha-forte-1"), "bootstrap");
        membro = newMember();
        staffToken = JwtTestTokenFactory.staffToken(staff.getId());
        returnDeadlineService.define(7, staff.getId());
    }

    @Test
    void checkoutBecomesBlockedOnlyAfterDeadlineWithoutChangingStoredStatus() throws Exception {
        Loan original = createLoan(newTool(), membro);

        at(original.getPrazoDevolucao().minusNanos(1));
        checkout(newTool(), membro, CHECKLIST_OK).andExpect(status().isCreated());

        at(original.getPrazoDevolucao());
        checkout(newTool(), membro, CHECKLIST_OK).andExpect(status().isCreated());

        at(original.getPrazoDevolucao().plusNanos(1));
        String requestedTool = newTool();
        assertBlocked(checkout(requestedTool, membro, CHECKLIST_OK), original)
                .andExpect(jsonPath("$.details", hasSize(1)));

        assertThat(loanRepository.findById(original.getId()).orElseThrow().getStatus()).isEqualTo(LoanStatus.ACTIVE);
        assertNoCheckout(requestedTool);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void overdueConflictPrecedesMissingOrIncompleteChecklist(boolean blankChecklist) throws Exception {
        Loan original = createLoan(newTool(), membro);
        at(original.getPrazoDevolucao().plusSeconds(1));
        String requestedTool = newTool();
        ChecklistRequest checklist = blankChecklist ? new ChecklistRequest(null, "", List.of()) : null;

        assertBlocked(checkout(requestedTool, membro, checklist), original)
                .andExpect(jsonPath("$.details", hasSize(1)));

        assertNoCheckout(requestedTool);
    }

    @Test
    void reportsEveryOverdueLoanAndOnlyUnblocksAfterLastReturn() throws Exception {
        Loan first = createLoan(newTool(), membro);
        at(START.plusSeconds(1));
        Loan second = createLoan(newTool(), membro);
        at(second.getPrazoDevolucao().plusSeconds(1));
        String requestedTool = newTool();

        assertBlocked(checkout(requestedTool, membro, CHECKLIST_OK), first, second)
                .andExpect(jsonPath("$.details", hasSize(2)))
                .andExpect(jsonPath("$.details[0]", containsString(first.getId())))
                .andExpect(jsonPath("$.details[1]", containsString(second.getId())));
        assertNoCheckout(requestedTool);

        simulateReturn(first);
        assertBlocked(checkout(requestedTool, membro, CHECKLIST_OK), second)
                .andExpect(jsonPath("$.details", hasSize(1)));
        assertNoCheckout(requestedTool);

        simulateReturn(second);
        checkout(requestedTool, membro, CHECKLIST_OK).andExpect(status().isCreated());
        assertThat(loanRepository.countByIdFerramentaAndStatus(requestedTool, LoanStatus.ACTIVE)).isEqualTo(1);
    }

    @ParameterizedTest
    @ValueSource(strings = {"RETURNED", "LOST"})
    void closedLoanDoesNotBlockEvenAfterDeadline(String loanStatus) throws Exception {
        Loan original = createLoan(newTool(), membro);
        jdbcTemplate.update("UPDATE emprestimos SET status = ? WHERE id = ?", loanStatus, original.getId());
        at(original.getPrazoDevolucao().plusSeconds(1));

        checkout(newTool(), membro, CHECKLIST_OK).andExpect(status().isCreated());
    }

    @Test
    void anotherMembersOverdueLoanDoesNotBlockCheckout() throws Exception {
        Loan otherMembersLoan = createLoan(newTool(), newMember());
        at(otherMembersLoan.getPrazoDevolucao().plusSeconds(1));

        checkout(newTool(), membro, CHECKLIST_OK).andExpect(status().isCreated());
    }

    @Test
    void futureActiveLoanDoesNotKeepMemberBlockedAfterLastOverdueLoanIsReturned() throws Exception {
        Loan overdue = createLoan(newTool(), membro);
        at(START.plus(1, ChronoUnit.DAYS));
        Loan future = createLoan(newTool(), membro);
        at(overdue.getPrazoDevolucao().plusSeconds(1));
        String requestedTool = newTool();

        assertBlocked(checkout(requestedTool, membro, CHECKLIST_OK), overdue)
                .andExpect(jsonPath("$.details", hasSize(1)));
        simulateReturn(overdue);

        checkout(requestedTool, membro, CHECKLIST_OK).andExpect(status().isCreated());
        assertThat(loanRepository.findById(future.getId()).orElseThrow().getStatus()).isEqualTo(LoanStatus.ACTIVE);
    }

    @Test
    void changingDefaultDeadlineDoesNotForgiveExistingOverdueLoan() throws Exception {
        Loan original = createLoan(newTool(), membro);
        at(original.getPrazoDevolucao().plusSeconds(1));
        returnDeadlineService.define(365, staff.getId());

        assertBlocked(checkout(newTool(), membro, CHECKLIST_OK), original);
        assertThat(loanRepository.findById(original.getId()).orElseThrow().getPrazoDevolucao())
                .isEqualTo(original.getPrazoDevolucao());
    }

    private void at(Instant instant) {
        when(clock.instant()).thenReturn(instant);
    }

    private User newMember() {
        return userService.registerMember(new UserCreateRequest("Membro", uniqueEmail(), "senha-forte-1"));
    }

    private static String uniqueEmail() {
        return UUID.randomUUID() + "@example.com";
    }

    private String newTool() {
        String codigo = "A-" + UUID.randomUUID().toString().substring(0, 12);
        return toolService.create(new ToolCreateRequest(codigo, "Furadeira", "Elétricas",
                new BigDecimal("350.00"), "Nova"), staff.getId()).getId();
    }

    private Loan createLoan(String toolId, User borrower) {
        return loanService.checkout(new LoanCreateRequest(toolId, borrower.getId(), CHECKLIST_OK), staff.getId()).loan();
    }

    private ResultActions checkout(String toolId, User borrower, ChecklistRequest checklist) throws Exception {
        return mockMvc.perform(post("/api/loans")
                .header("Authorization", "Bearer " + staffToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoanCreateRequest(toolId, borrower.getId(), checklist))));
    }

    private ResultActions assertBlocked(ResultActions response, Loan... loans) throws Exception {
        response.andExpect(status().isConflict())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("Conflict"))
                .andExpect(jsonPath("$.message", containsString("Membro bloqueado por inadimplência")));
        for (Loan loan : loans) {
            response.andExpect(jsonPath("$.message", containsString(loan.getId())))
                    .andExpect(jsonPath("$.message", containsString(loan.getIdFerramenta())))
                    .andExpect(jsonPath("$.message", containsString("em atraso desde " + loan.getPrazoDevolucao())))
                    .andExpect(jsonPath("$.details", hasItem(allOf(
                            containsString(loan.getId()), containsString(loan.getIdFerramenta()),
                            containsString("em atraso desde " + loan.getPrazoDevolucao())))));
        }
        return response;
    }

    private void assertNoCheckout(String toolId) {
        assertThat(jdbcTemplate.queryForObject("SELECT status FROM ferramentas WHERE id = ?", String.class, toolId))
                .isEqualTo("AVAILABLE");
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM emprestimos WHERE id_ferramenta = ?",
                Long.class, toolId)).isZero();
    }

    private void simulateReturn(Loan loan) {
        // R3-b implementará a operação de devolução; aqui se testa a liberação ao observar o estado encerrado.
        jdbcTemplate.update("UPDATE emprestimos SET status = 'RETURNED' WHERE id = ?", loan.getId());
        jdbcTemplate.update("UPDATE ferramentas SET status = 'AVAILABLE' WHERE id = ?", loan.getIdFerramenta());
    }
}
