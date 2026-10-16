package com.monitoolring.api.repository;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import com.monitoolring.api.domain.Tool;
import com.monitoolring.api.domain.ToolStatus;

public interface ToolRepository extends JpaRepository<Tool, String> {

    boolean existsByCodigo(String codigo);

    boolean existsByCodigoAndIdNot(String codigo, String id);

    List<Tool> findByStatus(ToolStatus status, Sort sort);
}
