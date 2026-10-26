package com.monitoolring.api.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.monitoolring.api.domain.ReturnDeadlineSetting;

public interface ReturnDeadlineSettingRepository extends JpaRepository<ReturnDeadlineSetting, Integer> {

    /** Consulta escalar para não reutilizar uma entidade antiga do contexto de persistência. */
    @Query("select s.dias from ReturnDeadlineSetting s where s.id = :id")
    Optional<Integer> findDiasById(@Param("id") Integer id);
}
