package com.monitoolring.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.monitoolring.api.domain.User;
import com.monitoolring.api.domain.UserRole;
import com.monitoolring.api.dto.UserCreateRequest;
import com.monitoolring.api.exception.DuplicateUserEmailException;
import com.monitoolring.api.repository.UserRepository;

class UserServiceTest {

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    private UserRepository userRepository;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        userService = new UserService(userRepository, passwordEncoder);
    }

    @Test
    void registerMemberNormalizesEmailHashesPasswordAndForcesMemberRole() {
        User created = userService.registerMember(
                new UserCreateRequest("  Ana  ", " Ana@Example.COM ", "senha-forte-1"));

        assertThat(created.getPapel()).isEqualTo(UserRole.MEMBER);
        assertThat(created.getEmail()).isEqualTo("ana@example.com");
        assertThat(created.getNome()).isEqualTo("Ana");
        assertThat(created.getSenhaHash()).isNotEqualTo("senha-forte-1");
        assertThat(passwordEncoder.matches("senha-forte-1", created.getSenhaHash())).isTrue();
        assertThat(created.getIdUsuarioCriacao()).isEqualTo(created.getId());
    }

    @Test
    void createStaffRecordsCreatorAndStaffRole() {
        User created = userService.createStaff(
                new UserCreateRequest("Bruno", "bruno@example.com", "senha-forte-1"), "staff-0");

        assertThat(created.getPapel()).isEqualTo(UserRole.STAFF);
        assertThat(created.getIdUsuarioCriacao()).isEqualTo("staff-0");
    }

    @Test
    void rejectsDuplicateEmailBeforeSaving() {
        when(userRepository.existsByEmail("ana@example.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.registerMember(
                new UserCreateRequest("Ana", "ANA@example.com", "senha-forte-1")))
                .isInstanceOf(DuplicateUserEmailException.class);
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void translatesUniqueConstraintRaceIntoDuplicateEmail() {
        when(userRepository.saveAndFlush(any(User.class))).thenThrow(new DataIntegrityViolationException("uq"));

        assertThatThrownBy(() -> userService.registerMember(
                new UserCreateRequest("Ana", "ana@example.com", "senha-forte-1")))
                .isInstanceOf(DuplicateUserEmailException.class);
    }
}
