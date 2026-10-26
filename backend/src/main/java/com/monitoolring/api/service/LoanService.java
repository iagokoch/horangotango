package com.monitoolring.api.service;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import com.monitoolring.api.domain.Checklist;
import com.monitoolring.api.domain.ChecklistType;
import com.monitoolring.api.domain.Loan;
import com.monitoolring.api.domain.LoanStatus;
import com.monitoolring.api.domain.Tool;
import com.monitoolring.api.domain.User;
import com.monitoolring.api.domain.UserRole;
import com.monitoolring.api.dto.ChecklistRequest;
import com.monitoolring.api.dto.LoanCreateRequest;
import com.monitoolring.api.dto.LoanReturnRequest;
import com.monitoolring.api.exception.LoanAccessDeniedException;
import com.monitoolring.api.exception.LoanNotFoundException;
import com.monitoolring.api.exception.MemberBlockedException;
import com.monitoolring.api.exception.MemberNotFoundException;
import com.monitoolring.api.exception.NotAMemberException;
import com.monitoolring.api.exception.ToolNotAvailableException;
import com.monitoolring.api.exception.ToolNotFoundException;
import com.monitoolring.api.repository.ChecklistRepository;
import com.monitoolring.api.repository.LoanRepository;
import com.monitoolring.api.repository.ToolRepository;
import com.monitoolring.api.repository.UserRepository;

@Service
public class LoanService {

    private final LoanRepository loanRepository;
    private final ChecklistRepository checklistRepository;
    private final ToolRepository toolRepository;
    private final UserRepository userRepository;
    private final ReturnDeadlineService returnDeadlineService;
    private final Clock clock;

    public LoanService(LoanRepository loanRepository, ChecklistRepository checklistRepository,
            ToolRepository toolRepository, UserRepository userRepository,
            ReturnDeadlineService returnDeadlineService, Clock clock) {
        this.loanRepository = loanRepository;
        this.checklistRepository = checklistRepository;
        this.toolRepository = toolRepository;
        this.userRepository = userRepository;
        this.returnDeadlineService = returnDeadlineService;
        this.clock = clock;
    }

    /**
     * Confirma a Retirada (FR-9 a FR-11) numa única transação. Ordem das verificações:
     * <ol>
     *   <li>prazo padrão configurado (FR-8) — 409;</li>
     *   <li>Membro existe (404), é Membro e não Staff (422) e não está bloqueado por atraso (FR-12 — 409);</li>
     *   <li>Ferramenta existe (404) e está AVAILABLE (409) — lida com lock pessimista;</li>
     *   <li>Checklist com os campos mínimos (FR-10) — 422. Vem depois do bloqueio, como pede o FR-12.</li>
     * </ol>
     * Ao confirmar: grava o Empréstimo com os dias vigentes e o prazo calculado, grava o Checklist de
     * Retirada e marca a Ferramenta como ON_LOAN. Após obter o lock, revalida o bloqueio e consulta
     * novamente o prazo vigente: ambos podem ter mudado durante a espera.
     */
    @Transactional
    public LoanDetails checkout(LoanCreateRequest request, String idStaff) {
        returnDeadlineService.getCurrentDays();

        User membro = userRepository.findById(request.membroId())
                .orElseThrow(() -> new MemberNotFoundException(request.membroId()));
        if (membro.getPapel() != UserRole.MEMBER) {
            throw new NotAMemberException(membro.getId());
        }
        assertMemberNotBlocked(membro);

        Tool tool = toolRepository.findByIdForUpdate(request.ferramentaId())
                .orElseThrow(() -> new ToolNotFoundException(request.ferramentaId()));
        tool.assertDisponivelParaRetirada();

        // A espera pelo lock pode atravessar um vencimento ou uma alteração do prazo padrão.
        assertMemberNotBlocked(membro);
        int diasPrazo = returnDeadlineService.getCurrentDays();

        Checklist.Dados dadosChecklist = toDados(request.checklist());
        Checklist.validarPreenchimento(dadosChecklist);

        Instant agora = now();
        Loan loan = Loan.registrarRetirada(UUID.randomUUID().toString(), tool.getId(), membro.getId(), idStaff,
                agora, diasPrazo);
        tool.registrarRetirada(idStaff, agora);
        try {
            loanRepository.saveAndFlush(loan);
        } catch (DataIntegrityViolationException ex) {
            // índice único parcial: já existe empréstimo ACTIVE para esta ferramenta (última linha de defesa)
            throw new ToolNotAvailableException(tool.getId());
        }
        Checklist checklist = checklistRepository.save(Checklist.criar(UUID.randomUUID().toString(), loan.getId(),
                ChecklistType.CHECKOUT, dadosChecklist, idStaff, agora));
        return new LoanDetails(loan, checklist, null);
    }

    /** FR-13/FR-14/FR-16: encerra Empréstimo, grava Checklist RETURN e libera a Ferramenta atomicamente. */
    @Transactional
    public LoanDetails returnLoan(String id, LoanReturnRequest request, String idStaff) {
        Loan loan = loanRepository.findByIdForUpdate(id).orElseThrow(() -> new LoanNotFoundException(id));
        loan.assertAtivo();

        Checklist.Dados dadosChecklist = toDados(request.checklist());
        Checklist.validarPreenchimento(dadosChecklist);

        Tool tool = toolRepository.findByIdForUpdate(loan.getIdFerramenta())
                .orElseThrow(() -> new ToolNotFoundException(loan.getIdFerramenta()));
        Instant agora = now();
        loan.registrarDevolucao(idStaff, agora);
        tool.registrarDevolucao(idStaff, agora);
        Checklist checklistDevolucao = checklistRepository.save(Checklist.criar(UUID.randomUUID().toString(), id,
                ChecklistType.RETURN, dadosChecklist, idStaff, agora));
        Checklist checklistRetirada = checklistRepository.findByIdEmprestimoAndTipo(id, ChecklistType.CHECKOUT)
                .orElse(null);
        return new LoanDetails(loan, checklistRetirada, checklistDevolucao);
    }

    /**
     * Staff vê qualquer Empréstimo; Membro só os próprios (FR-7) — 403 para os de outro Membro.
     * O mesmo snapshot cobre Empréstimo e Checklists, mesmo se uma Devolução confirmar entre as
     * consultas. A leitura não adquire locks de escrita.
     */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public LoanDetails findById(String id, String idUsuario, UserRole papel) {
        Loan loan = loanRepository.findById(id).orElseThrow(() -> new LoanNotFoundException(id));
        if (papel != UserRole.STAFF && !loan.pertenceAoMembro(idUsuario)) {
            throw new LoanAccessDeniedException();
        }
        Checklist checklistRetirada = checklistRepository.findByIdEmprestimoAndTipo(id, ChecklistType.CHECKOUT)
                .orElse(null);
        Checklist checklistDevolucao = checklistRepository.findByIdEmprestimoAndTipo(id, ChecklistType.RETURN)
                .orElse(null);
        return new LoanDetails(loan, checklistRetirada, checklistDevolucao);
    }

    /**
     * Recalcula o Bloqueio por Inadimplência a cada Retirada (FR-12, FR-17 e FR-18).
     * Só empréstimos ACTIVE com prazo estritamente anterior a agora bloqueiam; ao encerrar
     * o último atraso, a próxima tentativa é liberada sem flag persistida nem job.
     */
    void assertMemberNotBlocked(User membro) {
        Instant agora = clock.instant();
        List<String> emprestimosEmAtraso = loanRepository
                .findByIdMembroAndStatusOrderByPrazoDevolucaoAscIdAsc(membro.getId(), LoanStatus.ACTIVE)
                .stream()
                .filter(loan -> loan.getPrazoDevolucao().isBefore(agora))
                .map(loan -> "Empréstimo " + loan.getId() + ", ferramenta " + loan.getIdFerramenta()
                        + ", em atraso desde " + loan.getPrazoDevolucao() + ".")
                .toList();
        if (!emprestimosEmAtraso.isEmpty()) {
            throw new MemberBlockedException(emprestimosEmAtraso);
        }
    }

    private Instant now() {
        // o Postgres guarda microssegundos; truncar mantém a resposta do POST igual à de um GET posterior
        return clock.instant().truncatedTo(ChronoUnit.MICROS);
    }

    private static Checklist.Dados toDados(ChecklistRequest checklist) {
        if (checklist == null) {
            return null;
        }
        return new Checklist.Dados(checklist.estadoFuncional(), checklist.avariasVisiveis(),
                checklist.acessoriosInclusos());
    }

    public record LoanDetails(Loan loan, Checklist checklistRetirada, Checklist checklistDevolucao) {
    }
}
