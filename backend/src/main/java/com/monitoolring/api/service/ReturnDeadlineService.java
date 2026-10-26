package com.monitoolring.api.service;

import java.time.Clock;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import com.monitoolring.api.domain.ReturnDeadlineSetting;
import com.monitoolring.api.exception.ReturnDeadlineNotConfiguredException;
import com.monitoolring.api.repository.ReturnDeadlineSettingRepository;

@Service
public class ReturnDeadlineService {

    private final ReturnDeadlineSettingRepository repository;
    private final Clock clock;

    public ReturnDeadlineService(ReturnDeadlineSettingRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    /** Prazo vigente; lança {@link ReturnDeadlineNotConfiguredException} se ainda não configurado. */
    public ReturnDeadlineSetting getCurrent() {
        return repository.findById(ReturnDeadlineSetting.SINGLETON_ID)
                .orElseThrow(ReturnDeadlineNotConfiguredException::new);
    }

    /** Lê os dias vigentes no banco, inclusive após uma espera por lock na mesma transação. */
    public int getCurrentDays() {
        return repository.findDiasById(ReturnDeadlineSetting.SINGLETON_ID)
                .orElseThrow(ReturnDeadlineNotConfiguredException::new);
    }

    /** Substitui o prazo padrão por inteiro (PUT). Vale só para Retiradas confirmadas daqui em diante. */
    public ReturnDeadlineSetting define(int dias, String idUsuario) {
        try {
            return upsert(dias, idUsuario);
        } catch (DataIntegrityViolationException ex) {
            // corrida na primeira configuração: outra requisição inseriu a linha; agora é atualização
            return upsert(dias, idUsuario);
        }
    }

    private ReturnDeadlineSetting upsert(int dias, String idUsuario) {
        ReturnDeadlineSetting setting = repository.findById(ReturnDeadlineSetting.SINGLETON_ID)
                .map(existing -> {
                    existing.definir(dias, idUsuario, clock.instant());
                    return existing;
                })
                .orElseGet(() -> ReturnDeadlineSetting.criar(dias, idUsuario, clock.instant()));
        return repository.saveAndFlush(setting);
    }
}
