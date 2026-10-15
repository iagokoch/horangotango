package com.monitoolring.api.service;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.monitoolring.api.domain.User;
import com.monitoolring.api.domain.UserRole;
import com.monitoolring.api.dto.UserCreateRequest;
import com.monitoolring.api.exception.DuplicateUserEmailException;
import com.monitoolring.api.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /** Autocadastro público (FR-1): sempre cria papel MEMBER. */
    public User registerMember(UserCreateRequest request) {
        return create(request.nome(), request.email(), request.senha(), UserRole.MEMBER, null);
    }

    /** Staff cadastrando outro Staff (FR-2). */
    public User createStaff(UserCreateRequest request, String idStaffCriador) {
        return create(request.nome(), request.email(), request.senha(), UserRole.STAFF, idStaffCriador);
    }

    public static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private User create(String nome, String email, String senha, UserRole papel, String idUsuarioCriacao) {
        String normalizedEmail = normalizeEmail(email);
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new DuplicateUserEmailException(normalizedEmail);
        }
        User user = User.criar(UUID.randomUUID().toString(), nome.trim(), normalizedEmail,
                passwordEncoder.encode(senha), papel, idUsuarioCriacao, Instant.now());
        try {
            return userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            // corrida entre duas criações com o mesmo e-mail: a constraint única decide
            throw new DuplicateUserEmailException(normalizedEmail);
        }
    }
}
