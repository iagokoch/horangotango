package com.monitoolring.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.OptimisticLockingFailureException;

import com.monitoolring.api.domain.Tool;
import com.monitoolring.api.dto.ToolCreateRequest;
import com.monitoolring.api.dto.ToolUpdateRequest;
import com.monitoolring.api.exception.DuplicateToolCodigoException;
import com.monitoolring.api.exception.ToolNotFoundException;
import com.monitoolring.api.exception.ToolVersionConflictException;
import com.monitoolring.api.repository.ToolRepository;

class ToolServiceTest {

    private ToolRepository toolRepository;
    private ToolService toolService;

    @BeforeEach
    void setUp() {
        toolRepository = mock(ToolRepository.class);
        toolService = new ToolService(toolRepository);
    }

    @Test
    void createsToolWithAuditFieldsFromCurrentUser() {
        when(toolRepository.existsByCodigo("1LPJ89")).thenReturn(false);
        when(toolRepository.save(any(Tool.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ToolCreateRequest request = new ToolCreateRequest("1LPJ89", "Martelo", 10);
        Tool created = toolService.create(request, "user-1");

        assertThat(created.getId()).isNotBlank();
        assertThat(created.getCodigo()).isEqualTo("1LPJ89");
        assertThat(created.getNome()).isEqualTo("Martelo");
        assertThat(created.getQuantidade()).isEqualTo(10);
        assertThat(created.getIdUsuarioCriacao()).isEqualTo("user-1");
        assertThat(created.getIdUsuarioAlteracao()).isEqualTo("user-1");
        assertThat(created.getDataHoraCriacao()).isEqualTo(created.getDataHoraAlteracao());
        assertThat(created.getVersao()).isEqualTo(0);
    }

    @Test
    void rejectsCreateWhenCodigoAlreadyExists() {
        when(toolRepository.existsByCodigo("1LPJ89")).thenReturn(true);

        ToolCreateRequest request = new ToolCreateRequest("1LPJ89", "Martelo", 10);

        assertThatThrownBy(() -> toolService.create(request, "user-1"))
                .isInstanceOf(DuplicateToolCodigoException.class);
        verify(toolRepository, never()).save(any());
    }

    @Test
    void updatesToolWhenVersionMatches() {
        Tool existing = Tool.criar("id-1", "1LPJ89", "Martelo", 10, "user-1", Instant.parse("2026-01-01T00:00:00Z"));
        when(toolRepository.findById("id-1")).thenReturn(Optional.of(existing));
        when(toolRepository.existsByCodigoAndIdNot("1LPJ90", "id-1")).thenReturn(false);
        when(toolRepository.saveAndFlush(existing)).thenReturn(existing);

        ToolUpdateRequest request = new ToolUpdateRequest("1LPJ90", "Martelo Grande", 20, 0);
        Tool updated = toolService.update("id-1", request, "user-2");

        assertThat(updated.getCodigo()).isEqualTo("1LPJ90");
        assertThat(updated.getNome()).isEqualTo("Martelo Grande");
        assertThat(updated.getQuantidade()).isEqualTo(20);
        assertThat(updated.getIdUsuarioAlteracao()).isEqualTo("user-2");
        assertThat(updated.getIdUsuarioCriacao()).isEqualTo("user-1");
    }

    @Test
    void rejectsUpdateWhenVersionDiverges() {
        Tool existing = Tool.criar("id-1", "1LPJ89", "Martelo", 10, "user-1", Instant.now());
        when(toolRepository.findById("id-1")).thenReturn(Optional.of(existing));

        ToolUpdateRequest request = new ToolUpdateRequest("1LPJ89", "Martelo", 10, 5);

        assertThatThrownBy(() -> toolService.update("id-1", request, "user-2"))
                .isInstanceOf(ToolVersionConflictException.class);
        verify(toolRepository, never()).saveAndFlush(any());
    }

    @Test
    void rejectsUpdateWhenToolDoesNotExist() {
        when(toolRepository.findById("missing")).thenReturn(Optional.empty());

        ToolUpdateRequest request = new ToolUpdateRequest("1LPJ89", "Martelo", 10, 0);

        assertThatThrownBy(() -> toolService.update("missing", request, "user-1"))
                .isInstanceOf(ToolNotFoundException.class);
    }

    @Test
    void rejectsUpdateWhenCodigoBelongsToAnotherTool() {
        Tool existing = Tool.criar("id-1", "1LPJ89", "Martelo", 10, "user-1", Instant.now());
        when(toolRepository.findById("id-1")).thenReturn(Optional.of(existing));
        when(toolRepository.existsByCodigoAndIdNot("OUTRO", "id-1")).thenReturn(true);

        ToolUpdateRequest request = new ToolUpdateRequest("OUTRO", "Martelo", 10, 0);

        assertThatThrownBy(() -> toolService.update("id-1", request, "user-1"))
                .isInstanceOf(DuplicateToolCodigoException.class);
        verify(toolRepository, never()).saveAndFlush(any());
    }

    @Test
    void translatesConcurrentOptimisticLockFailureIntoVersionConflict() {
        Tool existing = Tool.criar("id-1", "1LPJ89", "Martelo", 10, "user-1", Instant.now());
        when(toolRepository.findById("id-1")).thenReturn(Optional.of(existing));
        when(toolRepository.existsByCodigoAndIdNot(eq("1LPJ89"), eq("id-1"))).thenReturn(false);
        when(toolRepository.saveAndFlush(existing)).thenThrow(new OptimisticLockingFailureException("conflict"));

        ToolUpdateRequest request = new ToolUpdateRequest("1LPJ89", "Martelo", 10, 0);

        assertThatThrownBy(() -> toolService.update("id-1", request, "user-1"))
                .isInstanceOf(ToolVersionConflictException.class);
    }
}
