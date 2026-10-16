package com.monitoolring.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import com.monitoolring.api.domain.ReturnDeadlineSetting;
import com.monitoolring.api.exception.ReturnDeadlineNotConfiguredException;
import com.monitoolring.api.repository.ReturnDeadlineSettingRepository;

class ReturnDeadlineServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-15T12:00:00Z");

    private ReturnDeadlineSettingRepository repository;
    private ReturnDeadlineService service;

    @BeforeEach
    void setUp() {
        repository = mock(ReturnDeadlineSettingRepository.class);
        when(repository.saveAndFlush(any(ReturnDeadlineSetting.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        service = new ReturnDeadlineService(repository, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void getCurrentFailsWhenNotConfigured() {
        when(repository.findById(ReturnDeadlineSetting.SINGLETON_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getCurrent()).isInstanceOf(ReturnDeadlineNotConfiguredException.class);
    }

    @Test
    void defineCreatesSingletonWithAuditFromClock() {
        when(repository.findById(ReturnDeadlineSetting.SINGLETON_ID)).thenReturn(Optional.empty());

        ReturnDeadlineSetting setting = service.define(7, "staff-1");

        assertThat(setting.getId()).isEqualTo(ReturnDeadlineSetting.SINGLETON_ID);
        assertThat(setting.getDias()).isEqualTo(7);
        assertThat(setting.getIdUsuarioAlteracao()).isEqualTo("staff-1");
        assertThat(setting.getDataHoraAlteracao()).isEqualTo(NOW);
    }

    @Test
    void defineReplacesExistingValue() {
        ReturnDeadlineSetting existing = ReturnDeadlineSetting.criar(7, "staff-1", Instant.parse("2026-01-01T00:00:00Z"));
        when(repository.findById(ReturnDeadlineSetting.SINGLETON_ID)).thenReturn(Optional.of(existing));

        ReturnDeadlineSetting setting = service.define(14, "staff-2");

        assertThat(setting).isSameAs(existing);
        assertThat(setting.getDias()).isEqualTo(14);
        assertThat(setting.getIdUsuarioAlteracao()).isEqualTo("staff-2");
        assertThat(setting.getDataHoraAlteracao()).isEqualTo(NOW);
    }

    @Test
    void retriesAsUpdateWhenFirstInsertRaces() {
        ReturnDeadlineSetting insertedByOther = ReturnDeadlineSetting.criar(3, "staff-x", NOW);
        when(repository.findById(ReturnDeadlineSetting.SINGLETON_ID))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(insertedByOther));
        when(repository.saveAndFlush(any(ReturnDeadlineSetting.class)))
                .thenThrow(new DataIntegrityViolationException("pk"))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ReturnDeadlineSetting setting = service.define(10, "staff-1");

        assertThat(setting.getDias()).isEqualTo(10);
        verify(repository, times(2)).saveAndFlush(any());
    }
}
