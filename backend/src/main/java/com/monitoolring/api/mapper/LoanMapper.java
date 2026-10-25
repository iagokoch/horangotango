package com.monitoolring.api.mapper;

import org.mapstruct.Mapper;

import com.monitoolring.api.domain.Checklist;
import com.monitoolring.api.domain.Loan;
import com.monitoolring.api.dto.ChecklistResponse;
import com.monitoolring.api.dto.LoanChecklistsResponse;
import com.monitoolring.api.dto.LoanResponse;

@Mapper(componentModel = "spring")
public interface LoanMapper {

    ChecklistResponse toResponse(Checklist checklist);

    default LoanResponse toResponse(Loan loan, Checklist checklistRetirada, Checklist checklistDevolucao) {
        return new LoanResponse(
                loan.getId(),
                loan.getIdFerramenta(),
                loan.getIdMembro(),
                loan.getIdStaffRetirada(),
                loan.getDataHoraRetirada(),
                loan.getDiasPrazo(),
                loan.getPrazoDevolucao(),
                loan.getStatus(),
                checklistRetirada == null ? null : toResponse(checklistRetirada),
                loan.getDataHoraDevolucao(),
                loan.getIdStaffDevolucao(),
                checklistDevolucao == null ? null : toResponse(checklistDevolucao));
    }

    default LoanChecklistsResponse toChecklistsResponse(String emprestimoId, Checklist checklistRetirada,
            Checklist checklistDevolucao) {
        return new LoanChecklistsResponse(emprestimoId,
                checklistRetirada == null ? null : toResponse(checklistRetirada),
                checklistDevolucao == null ? null : toResponse(checklistDevolucao));
    }
}
