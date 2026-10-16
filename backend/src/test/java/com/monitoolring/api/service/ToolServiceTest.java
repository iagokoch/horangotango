package com.monitoolring.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.Sort;
import org.springframework.test.util.ReflectionTestUtils;

import com.monitoolring.api.domain.Tool;
import com.monitoolring.api.domain.ToolStatus;
import com.monitoolring.api.dto.ToolCreateRequest;
import com.monitoolring.api.dto.ToolUpdateRequest;
import com.monitoolring.api.exception.DuplicateToolCodigoException;
import com.monitoolring.api.exception.InvalidToolStatusTransitionException;
import com.monitoolring.api.exception.ToolNotFoundException;
import com.monitoolring.api.exception.ToolStatusConflictException;
import com.monitoolring.api.exception.ToolVersionConflictException;
import com.monitoolring.api.repository.ToolRepository;

class ToolServiceTest {

    private static final BigDecimal VALOR = new BigDecimal("350.00");

    private ToolRepository toolRepository;
    private ToolService toolService;

    @BeforeEach
    void setUp() {
        toolRepository = mock(ToolRepository.class);
        when(toolRepository.saveAndFlush(any(Tool.class))).thenAnswer(invocation -> invocation.getArgument(0));
        toolService = new ToolService(toolRepository);
    }

    @Test
    void createsAvailableToolWithAuditFieldsFromCurrentUser() {
        when(toolRepository.existsByCodigo("1LPJ89")).thenReturn(false);
        when(toolRepository.save(any(Tool.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Tool created = toolService.create(createRequest("1LPJ89"), "user-1");

        assertThat(created.getId()).isNotBlank();
        assertThat(created.getCodigo()).isEqualTo("1LPJ89");
        assertThat(created.getNome()).isEqualTo("Furadeira de impacto");
        assertThat(created.getCategoria()).isEqualTo("Elétricas");
        assertThat(created.getValorEstimado()).isEqualByComparingTo("350.00");
        assertThat(created.getEstadoConservacao()).isEqualTo("Nova, sem avarias");
        assertThat(created.getStatus()).isEqualTo(ToolStatus.AVAILABLE);
        assertThat(created.getIdUsuarioCriacao()).isEqualTo("user-1");
        assertThat(created.getIdUsuarioAlteracao()).isEqualTo("user-1");
        assertThat(created.getDataHoraCriacao()).isEqualTo(created.getDataHoraAlteracao());
        assertThat(created.getVersao()).isEqualTo(0);
    }

    @Test
    void rejectsCreateWhenCodigoAlreadyExists() {
        when(toolRepository.existsByCodigo("1LPJ89")).thenReturn(true);

        assertThatThrownBy(() -> toolService.create(createRequest("1LPJ89"), "user-1"))
                .isInstanceOf(DuplicateToolCodigoException.class);
        verify(toolRepository, never()).save(any());
    }

    @Test
    void findAllFiltersByStatusWhenGiven() {
        Tool tool = existing(ToolStatus.AVAILABLE);
        when(toolRepository.findByStatus(eq(ToolStatus.AVAILABLE), any(Sort.class))).thenReturn(List.of(tool));

        assertThat(toolService.findAll(ToolStatus.AVAILABLE)).containsExactly(tool);
        verify(toolRepository, never()).findAll(any(Sort.class));
    }

    @Test
    void partialUpdateChangesOnlyGivenFields() {
        Tool existing = existing(ToolStatus.AVAILABLE);
        when(toolRepository.findById("id-1")).thenReturn(Optional.of(existing));

        Tool updated = toolService.update("id-1",
                patch(null, "Furadeira Grande", null, ToolStatus.AVAILABLE, 0), "user-2");

        assertThat(updated.getNome()).isEqualTo("Furadeira Grande");
        assertThat(updated.getCodigo()).isEqualTo("1LPJ89");
        assertThat(updated.getCategoria()).isEqualTo("Elétricas");
        assertThat(updated.getValorEstimado()).isEqualByComparingTo("350.00");
        assertThat(updated.getIdUsuarioAlteracao()).isEqualTo("user-2");
        assertThat(updated.getIdUsuarioCriacao()).isEqualTo("user-1");
        verify(toolRepository, never()).existsByCodigoAndIdNot(anyString(), anyString());
    }

    @Test
    void updateChecksCodigoUniquenessWhenCodigoChanges() {
        Tool existing = existing(ToolStatus.AVAILABLE);
        when(toolRepository.findById("id-1")).thenReturn(Optional.of(existing));
        when(toolRepository.existsByCodigoAndIdNot("OUTRO", "id-1")).thenReturn(true);

        assertThatThrownBy(() -> toolService.update("id-1", patch("OUTRO", null, null, null, 0), "user-1"))
                .isInstanceOf(DuplicateToolCodigoException.class);
        verify(toolRepository, never()).saveAndFlush(any());
    }

    @Test
    void staffCanInactivateAndReactivate() {
        Tool existing = existing(ToolStatus.AVAILABLE);
        when(toolRepository.findById("id-1")).thenReturn(Optional.of(existing));

        toolService.update("id-1", patch(null, null, null, ToolStatus.INACTIVE, 0), "user-2");
        assertThat(existing.getStatus()).isEqualTo(ToolStatus.INACTIVE);

        toolService.update("id-1", patch(null, null, null, ToolStatus.AVAILABLE, 0), "user-2");
        assertThat(existing.getStatus()).isEqualTo(ToolStatus.AVAILABLE);
    }

    @ParameterizedTest
    @EnumSource(value = ToolStatus.class, names = {"UNDER_REPAIR", "LOST"})
    void staffCanDecideDestinationOfToolUnderRepairOrLost(ToolStatus current) {
        Tool existing = existing(current);
        when(toolRepository.findById("id-1")).thenReturn(Optional.of(existing));

        toolService.update("id-1", patch(null, null, null, ToolStatus.AVAILABLE, 0), "user-2");

        assertThat(existing.getStatus()).isEqualTo(ToolStatus.AVAILABLE);
    }

    @ParameterizedTest
    @EnumSource(value = ToolStatus.class, names = {"ON_LOAN", "LOST", "UNDER_REPAIR"})
    void rejectsStatusesReservedForLoanFlows(ToolStatus requested) {
        Tool existing = existing(ToolStatus.AVAILABLE);
        when(toolRepository.findById("id-1")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> toolService.update("id-1", patch("NOVO", "Nome novo", null, requested, 0), "u"))
                .isInstanceOf(InvalidToolStatusTransitionException.class);
        assertThat(existing.getStatus()).isEqualTo(ToolStatus.AVAILABLE);
        assertThat(existing.getNome()).isEqualTo("Furadeira de impacto");
        verify(toolRepository, never()).saveAndFlush(any());
    }

    @ParameterizedTest
    @EnumSource(value = ToolStatus.class, names = {"INACTIVE", "AVAILABLE"})
    void toolOnLoanCannotChangeStatus(ToolStatus requested) {
        Tool existing = existing(ToolStatus.ON_LOAN);
        when(toolRepository.findById("id-1")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> toolService.update("id-1", patch(null, null, null, requested, 0), "u"))
                .isInstanceOf(ToolStatusConflictException.class);
        assertThat(existing.getStatus()).isEqualTo(ToolStatus.ON_LOAN);
    }

    @Test
    void toolOnLoanCanStillHaveDataEdited() {
        Tool existing = existing(ToolStatus.ON_LOAN);
        when(toolRepository.findById("id-1")).thenReturn(Optional.of(existing));

        Tool updated = toolService.update("id-1", patch(null, "Nome corrigido", null, ToolStatus.ON_LOAN, 0), "u");

        assertThat(updated.getNome()).isEqualTo("Nome corrigido");
        assertThat(updated.getStatus()).isEqualTo(ToolStatus.ON_LOAN);
    }

    @Test
    void rejectsUpdateWhenVersionDiverges() {
        Tool existing = existing(ToolStatus.AVAILABLE);
        when(toolRepository.findById("id-1")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> toolService.update("id-1", patch(null, "X", null, null, 5), "user-2"))
                .isInstanceOf(ToolVersionConflictException.class);
        verify(toolRepository, never()).saveAndFlush(any());
    }

    @Test
    void rejectsUpdateWhenToolDoesNotExist() {
        when(toolRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> toolService.update("missing", patch(null, "X", null, null, 0), "user-1"))
                .isInstanceOf(ToolNotFoundException.class);
    }

    @Test
    void translatesConcurrentOptimisticLockFailureIntoVersionConflict() {
        Tool existing = existing(ToolStatus.AVAILABLE);
        when(toolRepository.findById("id-1")).thenReturn(Optional.of(existing));
        when(toolRepository.saveAndFlush(existing)).thenThrow(new OptimisticLockingFailureException("conflict"));

        assertThatThrownBy(() -> toolService.update("id-1", patch(null, "X", null, null, 0), "user-1"))
                .isInstanceOf(ToolVersionConflictException.class);
    }

    private static ToolCreateRequest createRequest(String codigo) {
        return new ToolCreateRequest(codigo, "Furadeira de impacto", "Elétricas", VALOR, "Nova, sem avarias");
    }

    private static ToolUpdateRequest patch(String codigo, String nome, BigDecimal valor, ToolStatus status,
            int versao) {
        return new ToolUpdateRequest(codigo, nome, null, valor, null, status, versao);
    }

    private static Tool existing(ToolStatus status) {
        Tool tool = Tool.criar("id-1", "1LPJ89", "Furadeira de impacto", "Elétricas", VALOR,
                "Nova, sem avarias", "user-1", Instant.parse("2026-01-01T00:00:00Z"));
        // status ON_LOAN/LOST/UNDER_REPAIR só nascem dos fluxos de empréstimo (ainda não implementados)
        ReflectionTestUtils.setField(tool, "status", status);
        return tool;
    }
}
