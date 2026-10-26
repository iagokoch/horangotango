package com.monitoolring.api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

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
class LoanReadConsistencyIT extends AbstractIntegrationTest {

    private static final ChecklistRequest CHECKOUT =
            new ChecklistRequest(FunctionalState.INTACT, "Sem avarias", List.of("Maleta", "Broca"));
    private static final ChecklistRequest RETURN =
            new ChecklistRequest(FunctionalState.DEFECTIVE, "Risco na carcaça", List.of("Maleta"));

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private UserService users;
    @Autowired private ToolService tools;
    @Autowired private ReturnDeadlineService deadlines;
    @Autowired private LoanService loans;
    @SpyBean private LoanRepository loanRepository;
    @PersistenceContext private EntityManager entityManager;

    private String loanId;
    private String staffId;
    private String staffToken;
    private String memberToken;

    @BeforeEach
    void setUp() {
        User staff = users.createStaff(new UserCreateRequest("Staff", uniqueEmail(), "senha-forte-1"), "bootstrap");
        User member = users.registerMember(new UserCreateRequest("Membro", uniqueEmail(), "senha-forte-1"));
        staffId = staff.getId();
        staffToken = JwtTestTokenFactory.staffToken(staffId);
        memberToken = JwtTestTokenFactory.memberToken(member.getId());
        deadlines.define(7, staffId);
        String toolId = tools.create(new ToolCreateRequest("S-" + UUID.randomUUID().toString().substring(0, 12),
                "Furadeira", "Elétricas", BigDecimal.TEN, "Nova"), staffId).getId();
        loanId = loans.checkout(new LoanCreateRequest(toolId, member.getId(), CHECKOUT), staffId).loan().getId();
    }

    @ParameterizedTest(name = "checklists={0}, staff={1}")
    @CsvSource({"false, false", "false, true", "true, false", "true, true"})
    void getKeepsItsSnapshotWhenReturnCommitsBetweenLoanAndChecklistReads(
            boolean checklistsOnly, boolean asStaff) throws Exception {
        String path = "/api/loans/" + loanId + (checklistsOnly ? "/checklists" : "");
        String token = asStaff ? staffToken : memberToken;
        JsonNode before = read(path, token);
        assertThat(before.path("checklistRetirada").path("tipo").asText()).isEqualTo("CHECKOUT");
        assertThat(before.path("checklistRetirada").path("acessoriosInclusos").size()).isEqualTo(2);
        assertThat(before.path("checklistDevolucao").isNull()).isTrue();
        if (!checklistsOnly) {
            assertThat(before.path("status").asText()).isEqualTo("ACTIVE");
            assertThat(before.path("dataHoraDevolucao").isNull()).isTrue();
            assertThat(before.path("staffDevolucaoId").isNull()).isTrue();
        }

        CountDownLatch loanLoaded = new CountDownLatch(1);
        CountDownLatch returnCommitted = new CountDownLatch(1);
        AtomicBoolean pauseNextRead = new AtomicBoolean(true);
        // Mantém a leitura JPA real; pausa apenas depois de carregar Loan, antes dos checklists.
        doAnswer(invocation -> {
            Loan loaded = entityManager.find(Loan.class, loanId);
            if (pauseNextRead.compareAndSet(true, false)) {
                assertThat(loaded.getStatus().name()).isEqualTo("ACTIVE");
                loanLoaded.countDown();
                assertThat(returnCommitted.await(20, TimeUnit.SECONDS)).isTrue();
            }
            return Optional.ofNullable(loaded);
        }).when(loanRepository).findById(loanId);

        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<JsonNode> reading = executor.submit(() -> read(path, token));
            assertThat(loanLoaded.await(15, TimeUnit.SECONDS)).isTrue();
            // Deve confirmar enquanto o GET está pausado: a consulta não bloqueia a devolução.
            Future<JsonNode> returning = executor.submit(this::returnLoan);
            JsonNode returned = returning.get(15, TimeUnit.SECONDS);
            assertThat(returned.path("status").asText()).isEqualTo("RETURNED");
            assertThat(returned.path("staffDevolucaoId").asText()).isEqualTo(staffId);
            assertThat(returned.path("dataHoraDevolucao").asText()).isNotBlank();
            assertThat(returned.path("checklistDevolucao").path("tipo").asText()).isEqualTo("RETURN");
            assertThat(returned.path("checklistDevolucao").path("dataHoraRegistro").asText())
                    .isEqualTo(returned.path("dataHoraDevolucao").asText());
            assertThat(jdbc.queryForObject("SELECT status FROM emprestimos WHERE id = ?", String.class, loanId))
                    .isEqualTo("RETURNED");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM checklists WHERE id_emprestimo = ? AND tipo = 'RETURN'",
                    Integer.class, loanId)).isEqualTo(1);
            returnCommitted.countDown();

            assertThat(reading.get(15, TimeUnit.SECONDS)).as("GET deve manter o estado anterior ao commit")
                    .isEqualTo(before);
            JsonNode after = read(path, token);
            assertThat(after.path("checklistRetirada")).isEqualTo(before.path("checklistRetirada"));
            assertThat(after.path("checklistDevolucao")).isEqualTo(returned.path("checklistDevolucao"));
            if (!checklistsOnly) {
                assertThat(after).isEqualTo(returned);
            }
        } finally {
            returnCommitted.countDown();
            executor.shutdownNow();
            assertThat(executor.awaitTermination(10, TimeUnit.SECONDS)).isTrue();
        }
    }

    private JsonNode read(String path, String token) throws Exception {
        return mapper.readTree(mockMvc.perform(get(path).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray());
    }

    private JsonNode returnLoan() throws Exception {
        return mapper.readTree(mockMvc.perform(post("/api/loans/{id}/return", loanId)
                .header("Authorization", "Bearer " + staffToken).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(new LoanReturnRequest(RETURN))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray());
    }

    private static String uniqueEmail() {
        return UUID.randomUUID() + "@example.com";
    }
}
