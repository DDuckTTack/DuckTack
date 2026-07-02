package com.example.backend1.history.repo;

import com.example.backend1.diagnosis.domain.IssueType;
import com.example.backend1.history.service.HistoryEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface HistoryRepository
        extends JpaRepository<HistoryEntity, Long>,
        JpaSpecificationExecutor<HistoryEntity> {

    boolean existsByIdAndUserId(Long id, Long userId);

    void deleteByIdInAndUserId(List<Long> ids, Long userId);

    List<HistoryEntity> findByUserId(Long userId);

    Page<HistoryEntity> findByUserId(Long userId, Pageable pageable);

    List<HistoryEntity> findByUserIdAndIssueType(Long userId, IssueType issueType);

    List<HistoryEntity> findByUserIdAndRiskScoreGreaterThanEqual(Long userId, int riskScore);

    List<HistoryEntity> findByUserIdAndCreatedAtBetween(
            Long userId,
            OffsetDateTime start,
            OffsetDateTime end
    );

    Optional<HistoryEntity> findByUserIdAndDiagnosisId(Long userId, Long diagnosisId);

    Optional<HistoryEntity> findByUserIdAndDiagnosisResultId(Long userId, Long diagnosisResultId);

    Optional<HistoryEntity> findByReservation_Id(Long reservationId);
}
