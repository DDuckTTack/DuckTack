package com.example.backend1.history.service;

import com.example.backend1.diagnosis.domain.AnalysisStatus;
import com.example.backend1.diagnosis.domain.Diagnosis;
import com.example.backend1.diagnosis.domain.DiagnosisResult;
import com.example.backend1.diagnosis.domain.IssueType;
import com.example.backend1.reservation.domain.Reservation;
import com.example.backend1.user.domain.User;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "history", indexes = {
        @Index(name = "idx_history_user_created", columnList = "user_id, createdAt")
})
public class HistoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;

    /** 구 파이프라인 진단 (nullable - 새 파이프라인은 diagnosisResult 사용) */
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    private Diagnosis diagnosis;

    /** 새 파이프라인 진단 결과 (nullable - 구 파이프라인은 diagnosis 사용) */
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "diagnosis_result_id")
    private DiagnosisResult diagnosisResult;

    /** 히스토리와 예약 연결: History → Reservation → Company */
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "reservation_id")
    private Reservation reservation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AnalysisStatus status;

    @Column(nullable = false)
    private Integer riskScore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IssueType issueType;

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    protected HistoryEntity() {}

    public HistoryEntity(User user, Diagnosis diagnosis) {
        this.user = user;
        this.diagnosis = diagnosis;
        this.status = diagnosis.getStatus();
        this.riskScore = diagnosis.getRiskScore();
        this.issueType = diagnosis.getIssueType();
        this.createdAt = diagnosis.getCreatedAt();
    }

    public HistoryEntity(
            User user,
            Diagnosis diagnosis,
            AnalysisStatus status,
            Integer riskScore,
            IssueType issueType
    ) {
        this.user = user;
        this.diagnosis = diagnosis;
        this.status = status;
        this.riskScore = riskScore;
        this.issueType = issueType;
        this.createdAt = OffsetDateTime.now();
    }

    /** 새 파이프라인: DiagnosisResult 기반으로 생성 */
    public HistoryEntity(User user, DiagnosisResult result) {
        this.user = user;
        this.diagnosisResult = result;
        this.status = AnalysisStatus.COMPLETED;
        // DiagnosisResult.riskScore 는 0.0~1.0 스케일 → 0~100 으로 변환
        this.riskScore = result.getRiskScore() != null ? (int) Math.round(result.getRiskScore() * 100) : 0;
        this.issueType = result.getIssueType() != null ? result.getIssueType() : IssueType.ETC;
        this.createdAt = result.getCreatedAt();
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public Diagnosis getDiagnosis() { return diagnosis; }
    public DiagnosisResult getDiagnosisResult() { return diagnosisResult; }
    public Reservation getReservation() { return reservation; }
    public void setReservation(Reservation reservation) { this.reservation = reservation; }
    public AnalysisStatus getStatus() { return status; }
    public Integer getRiskScore() { return riskScore; }
    public IssueType getIssueType() { return issueType; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    /** diagnosisId: 새 파이프라인이면 diagnosisResult.id, 구 파이프라인이면 diagnosis.id */
    public Long resolveDiagnosisId() {
        if (diagnosisResult != null) return diagnosisResult.getId();
        if (diagnosis != null) return diagnosis.getId();
        return null;
    }

    public void refreshFromDiagnosis() {
        if (diagnosis != null) {
            this.status = diagnosis.getStatus();
            this.riskScore = diagnosis.getRiskScore();
            this.issueType = diagnosis.getIssueType();
        }
    }
}