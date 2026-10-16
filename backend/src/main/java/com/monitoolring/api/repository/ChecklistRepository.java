package com.monitoolring.api.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.monitoolring.api.domain.Checklist;
import com.monitoolring.api.domain.ChecklistType;

public interface ChecklistRepository extends JpaRepository<Checklist, String> {

    Optional<Checklist> findByIdEmprestimoAndTipo(String idEmprestimo, ChecklistType tipo);
}
