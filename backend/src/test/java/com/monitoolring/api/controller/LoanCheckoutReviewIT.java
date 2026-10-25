package com.monitoolring.api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.awaitility.Awaitility.await;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.monitoolring.api.domain.FunctionalState;
import com.monitoolring.api.domain.Loan;
import com.monitoolring.api.domain.User;
import com.monitoolring.api.dto.ChecklistRequest;
import com.monitoolring.api.dto.LoanCreateRequest;
import com.monitoolring.api.dto.ToolCreateRequest;
import com.monitoolring.api.dto.UserCreateRequest;
import com.monitoolring.api.exception.MemberBlockedException;
import com.monitoolring.api.service.LoanService;
import com.monitoolring.api.service.LoanService.LoanDetails;
import com.monitoolring.api.service.ReturnDeadlineService;
import com.monitoolring.api.service.ToolService;
import com.monitoolring.api.service.UserService;
import com.monitoolring.api.support.AbstractIntegrationTest;

/** Reproduz mudanças de estado enquanto uma Retirada aguarda o lock da Ferramenta. */
@SpringBootTest
class LoanCheckoutReviewIT extends AbstractIntegrationTest {

    private static final Instant START = Instant.parse("2026-10-01T12:00:00Z");
    private static final ChecklistRequest CHECKLIST =
            new ChecklistRequest(FunctionalState.INTACT, "Sem avarias", List.of("Nenhum"));

    @Autowired
    private LoanService loanService;

    @Autowired
    private ToolService toolService;

    @Autowired
    private UserService userService;

    @Autowired
    private ReturnDeadlineService returnDeadlineService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @MockBean
    private Clock clock;

    private final AtomicReference<Instant> currentTime = new AtomicReference<>();
    private User staff;
    private User member;
    private String requestedTool;

    @BeforeEach
    void setUp() {
        currentTime.set(START);
        when(clock.instant()).thenAnswer(invocation -> currentTime.get());
        staff = userService.createStaff(new UserCreateRequest("Staff", uniqueEmail(), "senha-forte-1"), "bootstrap");
        member = userService.registerMember(new UserCreateRequest("Membro", uniqueEmail(), "senha-forte-1"));
        returnDeadlineService.define(7, staff.getId());
        requestedTool = newTool();
    }

    @Test
    void deadlineCrossedWhileWaitingForToolMustBlockCheckout() {
        Loan existing = loanService.checkout(new LoanCreateRequest(newTool(), member.getId(), CHECKLIST),
                staff.getId()).loan();
        currentTime.set(existing.getPrazoDevolucao().minusSeconds(1));

        assertThatThrownBy(() -> checkoutAfterLockWait(
                () -> currentTime.set(existing.getPrazoDevolucao().plusSeconds(1))))
                .isInstanceOf(ExecutionException.class)
                .hasCauseInstanceOf(MemberBlockedException.class);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM emprestimos WHERE id_ferramenta = ?",
                Long.class, requestedTool)).isZero();
    }

    @Test
    void deadlineChangedWhileWaitingForToolMustApplyToNewCheckout() throws Exception {
        LoanDetails result = checkoutAfterLockWait(() -> {
            currentTime.set(START.plusSeconds(3600));
            returnDeadlineService.define(30, staff.getId());
        });

        assertThat(result.loan().getDiasPrazo()).isEqualTo(30);
        assertThat(result.loan().getDataHoraRetirada()).isEqualTo(START.plusSeconds(3600));
        assertThat(result.loan().getPrazoDevolucao()).isEqualTo(START.plusSeconds(3600 + 30 * 86400));
    }

    private LoanDetails checkoutAfterLockWait(Runnable whileWaiting) throws Exception {
        CountDownLatch toolLocked = new CountDownLatch(1);
        CountDownLatch releaseTool = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        Future<?> holder = executor.submit(() -> new TransactionTemplate(transactionManager)
                .executeWithoutResult(transaction -> {
                    jdbcTemplate.queryForObject("SELECT id FROM ferramentas WHERE id = ? FOR UPDATE",
                            String.class, requestedTool);
                    toolLocked.countDown();
                    try {
                        if (!releaseTool.await(15, TimeUnit.SECONDS)) {
                            throw new IllegalStateException("Lock de teste não foi liberado");
                        }
                    } catch (InterruptedException ex) {
                        Thread.currentThread().interrupt();
                        throw new IllegalStateException(ex);
                    }
                }));
        try {
            assertThat(toolLocked.await(10, TimeUnit.SECONDS)).isTrue();
            Future<LoanDetails> checkout = executor.submit(() -> loanService.checkout(
                    new LoanCreateRequest(requestedTool, member.getId(), CHECKLIST), staff.getId()));
            await().atMost(10, TimeUnit.SECONDS).until(() -> jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database() "
                            + "AND wait_event_type = 'Lock' AND query LIKE '%ferramentas%' "
                            + "AND pid <> pg_backend_pid()", Long.class) > 0);
            whileWaiting.run();
            releaseTool.countDown();
            return checkout.get(15, TimeUnit.SECONDS);
        } finally {
            releaseTool.countDown();
            try {
                holder.get(15, TimeUnit.SECONDS);
            } finally {
                executor.shutdownNow();
            }
        }
    }

    private String newTool() {
        return toolService.create(new ToolCreateRequest("R-" + UUID.randomUUID().toString().substring(0, 12),
                "Furadeira", "Elétricas", new BigDecimal("350.00"), "Nova"), staff.getId()).getId();
    }

    private static String uniqueEmail() {
        return UUID.randomUUID() + "@example.com";
    }
}
