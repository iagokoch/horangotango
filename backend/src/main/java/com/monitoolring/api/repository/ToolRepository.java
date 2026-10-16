package com.monitoolring.api.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import com.monitoolring.api.domain.Tool;
import com.monitoolring.api.domain.ToolStatus;

public interface ToolRepository extends JpaRepository<Tool, String> {

    boolean existsByCodigo(String codigo);

    boolean existsByCodigoAndIdNot(String codigo, String id);

    List<Tool> findByStatus(ToolStatus status, Sort sort);

    /**
     * Carrega a Ferramenta com {@code SELECT ... FOR UPDATE}: duas Retiradas simultâneas da mesma
     * Ferramenta são serializadas e a segunda já enxerga o status ON_LOAN (§5 Consistência).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Tool t where t.id = :id")
    Optional<Tool> findByIdForUpdate(@Param("id") String id);
}
