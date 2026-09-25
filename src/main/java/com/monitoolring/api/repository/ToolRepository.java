package com.monitoolring.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.monitoolring.api.domain.Tool;

public interface ToolRepository extends JpaRepository<Tool, String> {

    boolean existsByCodigo(String codigo);

    boolean existsByCodigoAndIdNot(String codigo, String id);
}
