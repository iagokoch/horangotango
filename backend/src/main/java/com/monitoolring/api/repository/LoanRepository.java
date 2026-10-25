package com.monitoolring.api.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import com.monitoolring.api.domain.Loan;
import com.monitoolring.api.domain.LoanStatus;

public interface LoanRepository extends JpaRepository<Loan, String> {

    long countByIdFerramentaAndStatus(String idFerramenta, LoanStatus status);

    List<Loan> findByIdMembroAndStatusOrderByPrazoDevolucaoAscIdAsc(String idMembro, LoanStatus status);

    /** Serializa devoluções do mesmo empréstimo para que só uma confirme a transição ACTIVE → RETURNED. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from Loan l where l.id = :id")
    Optional<Loan> findByIdForUpdate(@Param("id") String id);
}
