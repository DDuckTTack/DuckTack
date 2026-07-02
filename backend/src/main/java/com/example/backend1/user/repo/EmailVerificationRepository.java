package com.example.backend1.user.repo;

import com.example.backend1.user.domain.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {
  Optional<EmailVerification> findTopByEmailOrderByCreatedAtDesc(String email);
}

