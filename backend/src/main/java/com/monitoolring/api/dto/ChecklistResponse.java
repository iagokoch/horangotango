package com.monitoolring.api.dto;

import java.time.Instant;
import java.util.List;

import com.monitoolring.api.domain.ChecklistType;
import com.monitoolring.api.domain.FunctionalState;

public record ChecklistResponse(
        String id,
        ChecklistType tipo,
        FunctionalState estadoFuncional,
        String avariasVisiveis,
        List<String> acessoriosInclusos,
        String idUsuarioRegistro,
        Instant dataHoraRegistro
) {
}
