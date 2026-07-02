package com.example.backend1.user.service;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.user.domain.RefreshToken;
import com.example.backend1.user.domain.User;
import com.example.backend1.user.repo.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.HexFormat;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final int refreshDays;
    private final String pepper;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            @Value("${app.refresh.days}") int refreshDays,
            @Value("${app.refresh.pepper}") String pepper
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshDays = refreshDays;
        this.pepper = pepper;
    }

    public record Issued(String refreshToken, String refreshTokenHash, OffsetDateTime expiresAt) {}

    @Transactional
    public Issued issue(User user) {
        String token = generateToken();
        String hash = hash(token);
        OffsetDateTime exp = OffsetDateTime.now().plusDays(refreshDays);
        refreshTokenRepository.save(new RefreshToken(user, hash, exp));
        return new Issued(token, hash, exp);
    }

    @Transactional
    public RefreshToken validateActive(String refreshToken) {
        String hash = hash(refreshToken);
        RefreshToken rt = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new ApiException(ErrorCode.AUTH_FAILED));
        OffsetDateTime now = OffsetDateTime.now();
        if (rt.isRevoked() || rt.isExpired(now)) {
            throw new ApiException(ErrorCode.AUTH_FAILED);
        }
        return rt;
    }

    @Transactional
    public void revoke(String refreshToken) {
        String hash = hash(refreshToken);
        refreshTokenRepository.findByTokenHash(hash)
                .ifPresent(rt -> rt.revoke(OffsetDateTime.now(), null));
    }

    @Transactional
    public void revokeAllForUser(String username) {
        refreshTokenRepository.deleteByUserUsername(username);
    }

    @Transactional
    public Issued rotate(RefreshToken current) {
        Issued next = issue(current.getUser());
        current.revoke(OffsetDateTime.now(), next.refreshTokenHash());
        return next;
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private String hash(String token) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(pepper.getBytes(StandardCharsets.UTF_8));
            md.update((byte) ':');
            md.update(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(md.digest());
        } catch (Exception e) {
            throw new IllegalStateException("hash failed", e);
        }
    }
}

