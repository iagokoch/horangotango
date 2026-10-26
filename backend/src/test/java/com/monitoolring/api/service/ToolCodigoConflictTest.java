package com.monitoolring.api.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Optional;
import java.util.stream.Stream;

import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.dao.DataIntegrityViolationException;

import com.monitoolring.api.domain.Tool;
import com.monitoolring.api.dto.ToolCreateRequest;
import com.monitoolring.api.dto.ToolUpdateRequest;
import com.monitoolring.api.exception.DuplicateToolCodigoException;
import com.monitoolring.api.repository.ToolRepository;

class ToolCodigoConflictTest {

    private ToolRepository repository;
    private ToolService service;

    @BeforeEach
    void setUp() {
        repository = mock(ToolRepository.class);
        service = new ToolService(repository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void translatesOnlyNamedCodigoConstraintFromCauseChain(boolean update) {
        DataIntegrityViolationException failure = new DataIntegrityViolationException("write failed",
                new RuntimeException("wrapped", constraint("uq_ferramentas_codigo")));
        failWrite(failure);

        assertThatThrownBy(() -> write(update)).isInstanceOf(DuplicateToolCodigoException.class)
                .hasMessage("Já existe uma ferramenta cadastrada com o código 'NOVO'.");
    }

    @ParameterizedTest
    @MethodSource("unrelatedFailures")
    void createPreservesOtherIntegrityFailures(DataIntegrityViolationException failure) {
        failWrite(failure);
        assertThatThrownBy(() -> write(false)).isSameAs(failure);
    }

    @ParameterizedTest
    @MethodSource("unrelatedFailures")
    void updatePreservesOtherIntegrityFailures(DataIntegrityViolationException failure) {
        failWrite(failure);
        assertThatThrownBy(() -> write(true)).isSameAs(failure);
    }

    private void failWrite(DataIntegrityViolationException failure) {
        when(repository.save(any(Tool.class))).thenThrow(failure);
        when(repository.saveAndFlush(any(Tool.class))).thenThrow(failure);
        when(repository.findById("tool-1")).thenReturn(Optional.of(Tool.criar("tool-1", "ANTIGO",
                "Ferramenta", "Teste", BigDecimal.TEN, "Nova", "staff-1", Instant.now())));
    }

    private void write(boolean update) {
        if (update) {
            service.update("tool-1", new ToolUpdateRequest("NOVO", null, null, null, null, null, 0), "staff-2");
        } else {
            service.create(new ToolCreateRequest("NOVO", "Ferramenta", "Teste", BigDecimal.TEN, "Nova"),
                    "staff-2");
        }
    }

    private static Stream<DataIntegrityViolationException> unrelatedFailures() {
        return Stream.of(
                new DataIntegrityViolationException("write failed", constraint("outra_constraint")),
                new DataIntegrityViolationException("write failed", constraint(null)),
                new DataIntegrityViolationException("write failed",
                        new SQLException("uq_ferramentas_codigo", "23505")),
                new DataIntegrityViolationException("uq_ferramentas_codigo"));
    }

    private static ConstraintViolationException constraint(String name) {
        return new ConstraintViolationException("write failed", new SQLException("integrity", "23505"), name);
    }
}
