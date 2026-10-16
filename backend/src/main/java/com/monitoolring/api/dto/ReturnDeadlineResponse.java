package com.monitoolring.api.dto;

import java.time.Instant;

public record ReturnDeadlineResponse(
        int dias,
        String idUsuarioAlteracao,
        Instant dataHoraAlteracao
) {
}
