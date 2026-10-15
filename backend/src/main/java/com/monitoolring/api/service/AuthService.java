package com.monitoolring.api.service;

import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.monitoolring.api.domain.User;
import com.monitoolring.api.exception.InvalidCredentialsException;
import com.monitoolring.api.repository.UserRepository;
import com.monitoolring.api.security.IssuedToken;
import com.monitoolring.api.security.JwtService;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    /**
     * Hash usado quando o e-mail não existe, para que o tempo de resposta do login seja parecido
     * nos dois casos de falha e não revele quais e-mails estão cadastrados (FR-1).
     */
    private final String dummyHash;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.dummyHash = passwordEncoder.encode("monitoolring-dummy-password");
    }

    public Session login(String email, String senha) {
        Optional<User> user = userRepository.findByEmail(UserService.normalizeEmail(email));
        String hash = user.map(User::getSenhaHash).orElse(dummyHash);
        boolean passwordMatches = passwordEncoder.matches(senha, hash);
        if (user.isEmpty() || !passwordMatches) {
            throw new InvalidCredentialsException();
        }
        User authenticated = user.get();
        IssuedToken token = jwtService.issueToken(authenticated.getId(), authenticated.getPapel());
        return new Session(authenticated, token);
    }

    public record Session(User user, IssuedToken token) {
    }
}
