package com.monitoolring.api.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.monitoolring.api.domain.ToolStatus;

public record ToolResponse(
        String id,
        String codigo,
        String nome,
        String categoria,
        BigDecimal valorEstimado,
        String estadoConservacao,
        ToolStatus status,
        String idUsuarioCriacao,
        Instant dataHoraCriacao,
        String idUsuarioAlteracao,
        Instant dataHoraAlteracao,
        int versao
) {
}
