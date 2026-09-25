package com.monitoolring.api.dto;

import java.time.Instant;

public record ToolResponse(
        String id,
        String codigo,
        String nome,
        int quantidade,
        String idUsuarioCriacao,
        Instant dataHoraCriacao,
        String idUsuarioAlteracao,
        Instant dataHoraAlteracao,
        int versao
) {
}
