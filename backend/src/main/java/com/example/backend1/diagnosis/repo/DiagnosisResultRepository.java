package com.example.backend1.diagnosis.repo;

import com.example.backend1.diagnosis.domain.DiagnosisResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DiagnosisResultRepository extends JpaRepository<DiagnosisResult, Long> {

    Optional<DiagnosisResult> findByIdAndUserUsername(Long id, String username);

    Page<DiagnosisResult> findByUserUsernameOrderByCreatedAtDesc(String username, Pageable pageable);
}
