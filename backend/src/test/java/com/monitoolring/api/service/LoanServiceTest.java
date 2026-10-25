package com.monitoolring.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;

import com.monitoolring.api.domain.Checklist;
import com.monitoolring.api.domain.ChecklistType;
import com.monitoolring.api.domain.FunctionalState;
import com.monitoolring.api.domain.Loan;
import com.monitoolring.api.domain.LoanStatus;
import com.monitoolring.api.domain.Tool;
import com.monitoolring.api.domain.ToolStatus;
import com.monitoolring.api.domain.User;
import com.monitoolring.api.domain.UserRole;
import com.monitoolring.api.dto.ChecklistRequest;
import com.monitoolring.api.dto.LoanCreateRequest;
import com.monitoolring.api.exception.IncompleteChecklistException;
import com.monitoolring.api.exception.LoanAccessDeniedException;
import com.monitoolring.api.exception.LoanNotFoundException;
import com.monitoolring.api.exception.MemberBlockedException;
import com.monitoolring.api.exception.MemberNotFoundException;
import com.monitoolring.api.exception.NotAMemberException;
import com.monitoolring.api.exception.ReturnDeadlineNotConfiguredException;
import com.monitoolring.api.exception.ToolNotAvailableException;
import com.monitoolring.api.exception.ToolNotFoundException;
import com.monitoolring.api.repository.ChecklistRepository;
import com.monitoolring.api.repository.LoanRepository;
import com.monitoolring.api.repository.ToolRepository;
import com.monitoolring.api.repository.UserRepository;
import com.monitoolring.api.service.LoanService.LoanDetails;

class LoanServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-15T13:45:10.123456Z");
    private static final ChecklistRequest CHECKLIST_OK =
            new ChecklistRequest(FunctionalState.INTACT, "Sem avarias", List.of("Maleta", "Broca 8mm"));

    private LoanRepository loanRepository;
    private ChecklistRepository checklistRepository;
    private ToolRepository toolRepository;
    private UserRepository userRepository;
    private ReturnDeadlineService returnDeadlineService;
    private LoanService loanService;

    private User membro;
    private Tool tool;

    @BeforeEach
    void setUp() {
        loanRepository = mock(LoanRepository.class);
        checklistRepository = mock(ChecklistRepository.class);
        toolRepository = mock(ToolRepository.class);
        userRepository = mock(UserRepository.class);
        returnDeadlineService = mock(ReturnDeadlineService.class);
        loanService = new LoanService(loanRepository, checklistRepository, toolRepository, userRepository,
                returnDeadlineService, Clock.fixed(NOW, ZoneOffset.UTC));

        membro = User.criar("membro-1", "Marcos", "marcos@example.com", "hash", UserRole.MEMBER, null, NOW);
        tool = Tool.criar("tool-1", "FUR-01", "Furadeira", "Elétricas", new BigDecimal("300.00"), "Nova",
                "staff-0", NOW);

        when(returnDeadlineService.getCurrentDays()).thenReturn(7);
        when(userRepository.findById("membro-1")).thenReturn(Optional.of(membro));
        when(toolRepository.findByIdForUpdate("tool-1")).thenReturn(Optional.of(tool));
        when(loanRepository.saveAndFlush(any(Loan.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(checklistRepository.save(any(Checklist.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void checkoutRecordsLoanWithCurrentDeadlineChecklistAndMarksToolOnLoan() {
        LoanDetails details = loanService.checkout(request(CHECKLIST_OK), "staff-1");

        Loan loan = details.loan();
        assertThat(loan.getIdFerramenta()).isEqualTo("tool-1");
        assertThat(loan.getIdMembro()).isEqualTo("membro-1");
        assertThat(loan.getIdStaffRetirada()).isEqualTo("staff-1");
        assertThat(loan.getDataHoraRetirada()).isEqualTo(NOW);
        assertThat(loan.getDiasPrazo()).isEqualTo(7);
        assertThat(loan.getPrazoDevolucao()).isEqualTo(Instant.parse("2026-10-22T13:45:10.123456Z"));
        assertThat(loan.getStatus()).isEqualTo(LoanStatus.ACTIVE);

        Checklist checklist = details.checklistRetirada();
        assertThat(checklist.getIdEmprestimo()).isEqualTo(loan.getId());
        assertThat(checklist.getTipo()).isEqualTo(ChecklistType.CHECKOUT);
        assertThat(checklist.getEstadoFuncional()).isEqualTo(FunctionalState.INTACT);
        assertThat(checklist.getAvariasVisiveis()).isEqualTo("Sem avarias");
        assertThat(checklist.getAcessoriosInclusos()).containsExactly("Maleta", "Broca 8mm");
        assertThat(checklist.getIdUsuarioRegistro()).isEqualTo("staff-1");

        assertThat(tool.getStatus()).isEqualTo(ToolStatus.ON_LOAN);
        assertThat(tool.getIdUsuarioAlteracao()).isEqualTo("staff-1");
    }

    @Test
    void refusesWhenDeadlineNotConfigured() {
        when(returnDeadlineService.getCurrentDays()).thenThrow(new ReturnDeadlineNotConfiguredException());

        assertThatThrownBy(() -> loanService.checkout(request(CHECKLIST_OK), "staff-1"))
                .isInstanceOf(ReturnDeadlineNotConfiguredException.class);
        assertNothingRecorded();
    }

    @Test
    void refusesUnknownMember() {
        assertThatThrownBy(() -> loanService.checkout(
                new LoanCreateRequest("tool-1", "nao-existe", CHECKLIST_OK), "staff-1"))
                .isInstanceOf(MemberNotFoundException.class);
        assertNothingRecorded();
    }

    @Test
    void refusesStaffAsBorrower() {
        User staff = User.criar("staff-2", "Bruno", "bruno@example.com", "hash", UserRole.STAFF, null, NOW);
        when(userRepository.findById("staff-2")).thenReturn(Optional.of(staff));

        assertThatThrownBy(() -> loanService.checkout(
                new LoanCreateRequest("tool-1", "staff-2", CHECKLIST_OK), "staff-1"))
                .isInstanceOf(NotAMemberException.class);
        assertNothingRecorded();
    }

    @Test
    void blocksOverdueMemberBeforeToolLookupAndChecklistListingEveryLoan() {
        Loan first = Loan.registrarRetirada("loan-1", "tool-2", membro.getId(), "staff-0",
                NOW.minusSeconds(9 * 86400), 7);
        Loan second = Loan.registrarRetirada("loan-2", "tool-3", membro.getId(), "staff-0",
                NOW.minusSeconds(8 * 86400), 7);
        when(loanRepository.findByIdMembroAndStatusOrderByPrazoDevolucaoAscIdAsc(
                membro.getId(), LoanStatus.ACTIVE)).thenReturn(List.of(first, second));

        MemberBlockedException ex = catchThrowableOfType(
                () -> loanService.checkout(request(null), "staff-1"), MemberBlockedException.class);

        assertThat(ex.getEmprestimosEmAtraso()).containsExactly(
                "Empréstimo loan-1, ferramenta tool-2, em atraso desde " + first.getPrazoDevolucao() + ".",
                "Empréstimo loan-2, ferramenta tool-3, em atraso desde " + second.getPrazoDevolucao() + ".");
        ex.getEmprestimosEmAtraso().forEach(detail -> assertThat(ex.getMessage()).contains(detail));
        verify(toolRepository, never()).findByIdForUpdate(any());
        assertThat(tool.getStatus()).isEqualTo(ToolStatus.AVAILABLE);
        assertNothingRecorded();
    }

    @Test
    void refusesUnknownTool() {
        assertThatThrownBy(() -> loanService.checkout(
                new LoanCreateRequest("nao-existe", "membro-1", CHECKLIST_OK), "staff-1"))
                .isInstanceOf(ToolNotFoundException.class);
        assertNothingRecorded();
    }

    @ParameterizedTest
    @EnumSource(value = ToolStatus.class, names = "AVAILABLE", mode = EnumSource.Mode.EXCLUDE)
    void refusesToolThatIsNotAvailableNamingItsStatus(ToolStatus status) {
        ReflectionTestUtils.setField(tool, "status", status);

        assertThatThrownBy(() -> loanService.checkout(request(CHECKLIST_OK), "staff-1"))
                .isInstanceOf(ToolNotAvailableException.class)
                .hasMessageContaining(status.name())
                .hasMessageContaining(status.getRotulo());
        assertThat(tool.getStatus()).isEqualTo(status);
        assertNothingRecorded();
    }

    @Test
    void refusesMissingChecklist() {
        IncompleteChecklistException ex = catchThrowableOfType(
                () -> loanService.checkout(request(null), "staff-1"), IncompleteChecklistException.class);

        assertThat(ex.getProblemas()).containsExactly("checklist: obrigatório");
        assertThat(tool.getStatus()).isEqualTo(ToolStatus.AVAILABLE);
        assertNothingRecorded();
    }

    @Test
    void refusesBlankChecklistListingEveryMissingField() {
        ChecklistRequest blank = new ChecklistRequest(null, "   ", List.of());

        IncompleteChecklistException ex = catchThrowableOfType(
                () -> loanService.checkout(request(blank), "staff-1"), IncompleteChecklistException.class);

        assertThat(ex.getProblemas()).hasSize(3)
                .anySatisfy(p -> assertThat(p).startsWith("checklist.estadoFuncional"))
                .anySatisfy(p -> assertThat(p).startsWith("checklist.avariasVisiveis"))
                .anySatisfy(p -> assertThat(p).startsWith("checklist.acessoriosInclusos"));
        assertThat(tool.getStatus()).isEqualTo(ToolStatus.AVAILABLE);
        assertNothingRecorded();
    }

    @Test
    void refusesBlankAccessoryItem() {
        ChecklistRequest blankItem = new ChecklistRequest(FunctionalState.DEFECTIVE, "Risco na carcaça",
                Arrays.asList("Maleta", " ", null));

        assertThatThrownBy(() -> loanService.checkout(request(blankItem), "staff-1"))
                .isInstanceOf(IncompleteChecklistException.class);
        assertNothingRecorded();
    }

    @Test
    void translatesActiveLoanUniqueIndexViolationIntoNotAvailable() {
        when(loanRepository.saveAndFlush(any(Loan.class))).thenThrow(new DataIntegrityViolationException("uq"));

        assertThatThrownBy(() -> loanService.checkout(request(CHECKLIST_OK), "staff-1"))
                .isInstanceOf(ToolNotAvailableException.class);
        verify(checklistRepository, never()).save(any());
    }

    @Test
    void staffSeesAnyLoanAndMemberOnlyOwn() {
        Loan loan = Loan.registrarRetirada("loan-1", "tool-1", "membro-1", "staff-1", NOW, 7);
        when(loanRepository.findById("loan-1")).thenReturn(Optional.of(loan));
        when(checklistRepository.findByIdEmprestimoAndTipo("loan-1", ChecklistType.CHECKOUT))
                .thenReturn(Optional.empty());

        assertThat(loanService.findById("loan-1", "staff-9", UserRole.STAFF).loan()).isSameAs(loan);
        assertThat(loanService.findById("loan-1", "membro-1", UserRole.MEMBER).loan()).isSameAs(loan);
        assertThatThrownBy(() -> loanService.findById("loan-1", "membro-2", UserRole.MEMBER))
                .isInstanceOf(LoanAccessDeniedException.class);
        assertThatThrownBy(() -> loanService.findById("nao-existe", "staff-9", UserRole.STAFF))
                .isInstanceOf(LoanNotFoundException.class);
    }

    private static LoanCreateRequest request(ChecklistRequest checklist) {
        return new LoanCreateRequest("tool-1", "membro-1", checklist);
    }

    private void assertNothingRecorded() {
        verify(loanRepository, never()).saveAndFlush(any());
        verify(checklistRepository, never()).save(any());
    }
}
