package com.monitoolring.api.service;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.monitoolring.api.domain.Checklist;
import com.monitoolring.api.domain.ChecklistType;
import com.monitoolring.api.domain.Loan;
import com.monitoolring.api.domain.Tool;
import com.monitoolring.api.domain.User;
import com.monitoolring.api.domain.UserRole;
import com.monitoolring.api.dto.ChecklistRequest;
import com.monitoolring.api.dto.LoanCreateRequest;
import com.monitoolring.api.exception.LoanAccessDeniedException;
import com.monitoolring.api.exception.LoanNotFoundException;
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
     *   <li>Membro existe (404), é Membro e não Staff (422) e não está bloqueado (FR-12, rodada 3);</li>
     *   <li>Ferramenta existe (404) e está AVAILABLE (409) — lida com lock pessimista;</li>
     *   <li>Checklist com os campos mínimos (FR-10) — 422. Vem depois do bloqueio, como pede o FR-12.</li>
     * </ol>
     * Ao confirmar: grava o Empréstimo com os dias vigentes e o prazo calculado, grava o Checklist de
     * Retirada e marca a Ferramenta como ON_LOAN.
     */
    @Transactional
    public LoanDetails checkout(LoanCreateRequest request, String idStaff) {
        int diasPrazo = returnDeadlineService.getCurrent().getDias();

        User membro = userRepository.findById(request.membroId())
                .orElseThrow(() -> new MemberNotFoundException(request.membroId()));
        if (membro.getPapel() != UserRole.MEMBER) {
            throw new NotAMemberException(membro.getId());
        }
        assertMemberNotBlocked(membro);

        Tool tool = toolRepository.findByIdForUpdate(request.ferramentaId())
                .orElseThrow(() -> new ToolNotFoundException(request.ferramentaId()));
        tool.assertDisponivelParaRetirada();

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
        return new LoanDetails(loan, checklist);
    }

    /** Staff vê qualquer Empréstimo; Membro só os próprios (FR-7) — 403 para os de outro Membro. */
    @Transactional(readOnly = true)
    public LoanDetails findById(String id, String idUsuario, UserRole papel) {
        Loan loan = loanRepository.findById(id).orElseThrow(() -> new LoanNotFoundException(id));
        if (papel != UserRole.STAFF && !loan.pertenceAoMembro(idUsuario)) {
            throw new LoanAccessDeniedException();
        }
        Checklist checklistRetirada = checklistRepository.findByIdEmprestimoAndTipo(id, ChecklistType.CHECKOUT)
                .orElse(null);
        return new LoanDetails(loan, checklistRetirada);
    }

    /**
     * Ponto de entrada do Bloqueio por Inadimplência (FR-12): na rodada 3, recusar aqui (409) o Membro
     * com algum Empréstimo em Atraso, informando quais e desde quando. Fica antes da validação do
     * Checklist, como exige o FR-12. Por enquanto não bloqueia ninguém.
     */
    void assertMemberNotBlocked(User membro) {
        // FR-12 — implementação na rodada 3
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

    public record LoanDetails(Loan loan, Checklist checklistRetirada) {
    }
}
