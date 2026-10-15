package com.monitoolring.api.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.monitoolring.api.domain.User;
import com.monitoolring.api.domain.UserRole;

public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByPapel(UserRole papel);
}
