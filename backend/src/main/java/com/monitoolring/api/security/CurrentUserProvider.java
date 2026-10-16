package com.monitoolring.api.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.monitoolring.api.domain.UserRole;

@Component
public class CurrentUserProvider {

    private static final String ROLE_PREFIX = "ROLE_";

    public String getCurrentUserId() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    /** Papel do usuário autenticado, a partir da authority {@code ROLE_*} montada pelo filtro JWT. */
    public UserRole getCurrentUserRole() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(authority -> authority.startsWith(ROLE_PREFIX))
                .map(authority -> UserRole.valueOf(authority.substring(ROLE_PREFIX.length())))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Usuário autenticado sem papel."));
    }
}
