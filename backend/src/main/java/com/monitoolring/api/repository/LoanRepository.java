package com.monitoolring.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.monitoolring.api.domain.Loan;
import com.monitoolring.api.domain.LoanStatus;

public interface LoanRepository extends JpaRepository<Loan, String> {

    long countByIdFerramentaAndStatus(String idFerramenta, LoanStatus status);
}
