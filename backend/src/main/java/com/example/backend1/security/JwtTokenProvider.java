package com.example.backend1.security;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

@Component
public class JwtTokenProvider {

  private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

  private final SecretKey key;
  private final String issuer;
  private final long accessTokenSeconds;

  public JwtTokenProvider(
          @Value("${app.jwt.secret}") String secret,
          @Value("${app.jwt.issuer}") String issuer,
          @Value("${app.jwt.access-token-minutes}") long accessTokenMinutes
  ) {
    log.info("JwtTokenProvider initialized: issuer={}, accessTokenMinutes={}", issuer, accessTokenMinutes);

    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.issuer = issuer;
    this.accessTokenSeconds = accessTokenMinutes * 60L;
  }

  public String createAccessToken(Authentication auth, Long userId, String username) {
    Instant now = Instant.now();
    Instant exp = now.plusSeconds(accessTokenSeconds);

    return Jwts.builder()
            .issuer(issuer)
            .subject(username)
            .issuedAt(Date.from(now))
            .expiration(Date.from(exp))
            .claims(Map.of("uid", userId))
            .signWith(key)
            .compact();
  }

  public Claims parseClaims(String token) {
    try {
      return Jwts.parser()
              .verifyWith(key)
              .build()
              .parseSignedClaims(token)
              .getPayload();
    } catch (Exception e) {
      log.warn("JWT 파싱 실패: {}", e.getMessage());
      throw new ApiException(ErrorCode.AUTH_FAILED);
    }
  }
}