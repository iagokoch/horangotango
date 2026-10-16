package com.monitoolring.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.monitoolring.api.domain.ReturnDeadlineSetting;

public interface ReturnDeadlineSettingRepository extends JpaRepository<ReturnDeadlineSetting, Integer> {
}
