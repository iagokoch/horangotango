package com.monitoolring.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

import com.monitoolring.api.domain.Checklist;
import com.monitoolring.api.domain.ChecklistType;
import com.monitoolring.api.domain.FunctionalState;
import com.monitoolring.api.domain.Loan;
import com.monitoolring.api.domain.LoanStatus;
import com.monitoolring.api.domain.Tool;
import com.monitoolring.api.domain.ToolStatus;
import com.monitoolring.api.dto.ChecklistRequest;
import com.monitoolring.api.dto.LoanReturnRequest;
import com.monitoolring.api.exception.IncompleteChecklistException;
import com.monitoolring.api.exception.LoanAlreadyClosedException;
import com.monitoolring.api.exception.LoanNotFoundException;
import com.monitoolring.api.repository.ChecklistRepository;
import com.monitoolring.api.repository.LoanRepository;
import com.monitoolring.api.repository.ToolRepository;
import com.monitoolring.api.repository.UserRepository;

class LoanReturnServiceTest {

    private static final Instant CHECKOUT_TIME = Instant.parse("2026-10-15T12:00:00Z");
    private static final Instant RETURN_TIME = Instant.parse("2026-10-25T12:00:00.123456789Z");
    private static final ChecklistRequest CHECKLIST_OK =
            new ChecklistRequest(FunctionalState.INTACT, "Sem avarias", List.of("Maleta"));

    private LoanRepository loanRepository;
    private ChecklistRepository checklistRepository;
    private ToolRepository toolRepository;
    private LoanService loanService;
    private Loan loan;
    private Tool tool;
    private Checklist checkoutChecklist;

    @BeforeEach
    void setUp() {
        loanRepository = mock(LoanRepository.class);
        checklistRepository = mock(ChecklistRepository.class);
        toolRepository = mock(ToolRepository.class);
        loanService = new LoanService(loanRepository, checklistRepository, toolRepository, mock(UserRepository.class),
                mock(ReturnDeadlineService.class), Clock.fixed(RETURN_TIME, ZoneOffset.UTC));
        loan = Loan.registrarRetirada("loan-1", "tool-1", "member-1", "staff-checkout", CHECKOUT_TIME, 7);
        tool = Tool.criar("tool-1", "FUR-1", "Furadeira", "Elétricas", new BigDecimal("350.00"), "Nova",
                "staff-checkout", CHECKOUT_TIME);
        tool.registrarRetirada("staff-checkout", CHECKOUT_TIME);
        checkoutChecklist = Checklist.criar("checkout-1", loan.getId(), ChecklistType.CHECKOUT,
                new Checklist.Dados(FunctionalState.INTACT, "Sem avarias", List.of("Maleta")),
                "staff-checkout", CHECKOUT_TIME);
        when(loanRepository.findByIdForUpdate("loan-1")).thenReturn(Optional.of(loan));
        when(toolRepository.findByIdForUpdate("tool-1")).thenReturn(Optional.of(tool));
        when(checklistRepository.save(any(Checklist.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(checklistRepository.findByIdEmprestimoAndTipo("loan-1", ChecklistType.CHECKOUT))
                .thenReturn(Optional.of(checkoutChecklist));
    }

    @Test
    void recordsReturnWithSameTimestampAndPreservesCheckout() {
        var details = loanService.returnLoan("loan-1", new LoanReturnRequest(CHECKLIST_OK), "staff-return");
        Instant storedTime = RETURN_TIME.truncatedTo(ChronoUnit.MICROS);

        assertThat(details.loan()).isSameAs(loan);
        assertThat(loan.getStatus()).isEqualTo(LoanStatus.RETURNED);
        assertThat(loan.getDataHoraDevolucao()).isEqualTo(storedTime);
        assertThat(loan.getIdStaffDevolucao()).isEqualTo("staff-return");
        assertThat(loan.getDataHoraRetirada()).isEqualTo(CHECKOUT_TIME);
        assertThat(loan.getIdStaffRetirada()).isEqualTo("staff-checkout");
        assertThat(loan.getPrazoDevolucao()).isEqualTo(CHECKOUT_TIME.plus(7, ChronoUnit.DAYS));
        assertThat(details.checklistRetirada()).isSameAs(checkoutChecklist);
        assertThat(details.checklistDevolucao().getTipo()).isEqualTo(ChecklistType.RETURN);
        assertThat(details.checklistDevolucao().getIdEmprestimo()).isEqualTo(loan.getId());
        assertThat(details.checklistDevolucao().getDataHoraRegistro()).isEqualTo(storedTime);
        assertThat(details.checklistDevolucao().getIdUsuarioRegistro()).isEqualTo("staff-return");
        assertThat(tool.getStatus()).isEqualTo(ToolStatus.AVAILABLE);
        assertThat(tool.getIdUsuarioAlteracao()).isEqualTo("staff-return");
        assertThat(tool.getDataHoraAlteracao()).isEqualTo(storedTime);

        assertThatThrownBy(() -> loan.registrarDevolucao("other-staff", RETURN_TIME.plusSeconds(1)))
                .isInstanceOf(LoanAlreadyClosedException.class);
        assertThat(loan.getIdStaffDevolucao()).isEqualTo("staff-return");
        assertThat(loan.getDataHoraDevolucao()).isEqualTo(storedTime);
    }

    @Test
    void unknownLoanIsNotFound() {
        assertThatThrownBy(() -> loanService.returnLoan("missing", new LoanReturnRequest(CHECKLIST_OK), "staff"))
                .isInstanceOf(LoanNotFoundException.class);
        verify(toolRepository, never()).findByIdForUpdate(any());
        verify(checklistRepository, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"RETURNED", "LOST"})
    void closedLoanIsRejectedBeforeChecklistOrTool(String status) {
        ReflectionTestUtils.setField(loan, "status", LoanStatus.valueOf(status));

        assertThatThrownBy(() -> loanService.returnLoan("loan-1", new LoanReturnRequest(null), "staff"))
                .isInstanceOf(LoanAlreadyClosedException.class)
                .hasMessageContaining("loan-1")
                .hasMessageContaining(status);
        verify(toolRepository, never()).findByIdForUpdate(any());
        verify(checklistRepository, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void missingOrBlankChecklistDoesNotChangeLoanOrTool(boolean blank) {
        ChecklistRequest checklist = blank ? new ChecklistRequest(null, "", List.of()) : null;

        assertThatThrownBy(() -> loanService.returnLoan("loan-1", new LoanReturnRequest(checklist), "staff"))
                .isInstanceOf(IncompleteChecklistException.class);
        assertThat(loan.getStatus()).isEqualTo(LoanStatus.ACTIVE);
        assertThat(loan.getDataHoraDevolucao()).isNull();
        assertThat(tool.getStatus()).isEqualTo(ToolStatus.ON_LOAN);
        verify(toolRepository, never()).findByIdForUpdate(any());
        verify(checklistRepository, never()).save(any());
    }
}
