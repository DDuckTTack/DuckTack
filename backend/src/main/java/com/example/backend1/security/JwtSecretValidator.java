package com.example.backend1.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import jakarta.annotation.PostConstruct;
import java.util.Arrays;

@Configuration
public class JwtSecretValidator {

    private final String secret;
    private final Environment env;

    public JwtSecretValidator(
            @Value("${app.jwt.secret}") String secret,
            Environment env
    ) {
        this.secret = secret;
        this.env = env;
    }

    @PostConstruct
    public void validate() {
        boolean isProdLike = Arrays.stream(env.getActiveProfiles())
                .noneMatch(p -> p.equalsIgnoreCase("dev") || p.equalsIgnoreCase("local") || p.equalsIgnoreCase("test"));

        if (!isProdLike) return;

        if (secret == null || secret.isBlank() || secret.startsWith("CHANGE_ME")) {
            throw new IllegalStateException("JWT secret must be set via environment (JWT_SECRET) for non-dev profiles.");
        }
        if (secret.getBytes(java.nio.charset.StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT secret too short. Use at least 32 bytes.");
        }
    }
}

