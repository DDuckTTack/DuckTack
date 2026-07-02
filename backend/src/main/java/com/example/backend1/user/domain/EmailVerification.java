package com.example.backend1.user.domain;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "email_verifications", indexes = {
        @Index(name = "idx_email_verifications_email", columnList = "email")
})
public class EmailVerification {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 255)
  private String email;

  @Column(nullable = false, length = 255)
  private String codeHash;

  @Column(nullable = false)
  private OffsetDateTime expiresAt;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  private OffsetDateTime verifiedAt;

  protected EmailVerification() {}

  public EmailVerification(String email, String codeHash, OffsetDateTime expiresAt) {
    this.email = email;
    this.codeHash = codeHash;
    this.expiresAt = expiresAt;
  }

  public Long getId() { return id; }
  public String getEmail() { return email; }
  public String getCodeHash() { return codeHash; }
  public OffsetDateTime getExpiresAt() { return expiresAt; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
  public OffsetDateTime getVerifiedAt() { return verifiedAt; }

  public boolean isExpired(OffsetDateTime now) {
    return now.isAfter(expiresAt);
  }

  public boolean isVerified() {
    return verifiedAt != null;
  }

  public void markVerified(OffsetDateTime now) {
    this.verifiedAt = now;
  }
}
