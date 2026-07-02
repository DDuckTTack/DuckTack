package com.example.backend1.diagnosis.domain;

import com.example.backend1.user.domain.User;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

/**
 * 새 AI 진단 흐름(YOLO + LLM) 의 결과를 영속화하는 엔티티.
 *
 * <p>기존 {@link Diagnosis} (비동기 분석 + PDF 리포트) 와는 별개의 흐름이라 분리해 두었다.
 * <p>한 번의 동기 호출로 YOLO detection + 위험도 + LLM 가이드까지 모두 채워 저장.
 *
 * <p>{@code yoloRawJson} / {@code guideJson} 은 외부 응답을 그대로 보존하기 위한 JSON 텍스트 컬럼.
 * <p>(DB 가 PostgreSQL 이므로 추후 JSONB 타입으로 마이그레이션 가능)
 */
@Entity
@Table(name = "diagnosis_result", indexes = {
        @Index(name = "idx_diag_result_user_created", columnList = "user_id, createdAt")
})
public class DiagnosisResult {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    /** 사용자가 업로드한 이미지의 storage key (FileStorage). */
    @Column(name = "image_key", length = 200)
    private String imageKey;

    /** 외부 노출용 공개 URL (캐시). */
    @Column(name = "image_url", length = 500)
    private String imageUrl;

    /** YOLO 응답 원본 JSON (감사/디버깅용). */
    @Column(name = "yolo_raw_json", columnDefinition = "TEXT")
    private String yoloRawJson;

    /** 위험도 점수 0.0 ~ 1.0 (정밀도). */
    @Column(name = "risk_score")
    private Double riskScore;

    /** "LOW" / "MEDIUM" / "HIGH" / "NONE". */
    @Column(name = "risk_level", length = 20)
    private String riskLevel;

    /** 메인 결함 종류 (DefectClass.name()). */
    @Column(name = "main_defect", length = 30)
    private String mainDefect;

    /** 백엔드 도메인 ENUM 매핑 (Diagnosis.issueType 와 호환). */
    @Enumerated(EnumType.STRING)
    @Column(name = "issue_type", length = 20)
    private IssueType issueType;

    /** LLM 이 생성한 가이드 + 자재 추천 JSON. */
    @Column(name = "guide_json", columnDefinition = "TEXT")
    private String guideJson;

    /** LLM 호출이 실패해 fallback 가이드를 사용했는지 여부. */
    @Column(name = "guide_fallback", nullable = false)
    private boolean guideFallback = false;

    /** 프론트에서 생성·업로드한 PDF 의 storage key */
    @Column(name = "pdf_storage_key", length = 200)
    private String pdfStorageKey;

    /** 프론트에서 생성·업로드한 PDF 의 공개 URL */
    @Column(name = "pdf_url", length = 500)
    private String pdfUrl;

    @Column(nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    protected DiagnosisResult() {}

    public DiagnosisResult(User user) {
        this.user = user;
    }

    // --- getters ---

    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getImageKey() { return imageKey; }
    public String getImageUrl() { return imageUrl; }
    public String getYoloRawJson() { return yoloRawJson; }
    public Double getRiskScore() { return riskScore; }
    public String getRiskLevel() { return riskLevel; }
    public String getMainDefect() { return mainDefect; }
    public IssueType getIssueType() { return issueType; }
    public String getGuideJson() { return guideJson; }
    public boolean isGuideFallback() { return guideFallback; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    // --- builders / mutators ---

    public void attachImage(String imageKey, String imageUrl) {
        this.imageKey = imageKey;
        this.imageUrl = imageUrl;
    }

    public void applyYolo(String yoloRawJson) {
        this.yoloRawJson = yoloRawJson;
    }

    public void applyRisk(Double riskScore, String riskLevel, String mainDefect, IssueType issueType) {
        this.riskScore = riskScore;
        this.riskLevel = riskLevel;
        this.mainDefect = mainDefect;
        this.issueType = issueType;
    }

    public void applyGuide(String guideJson, boolean fallback) {
        this.guideJson = guideJson;
        this.guideFallback = fallback;
    }

    public String getPdfStorageKey() { return pdfStorageKey; }
    public String getPdfUrl() { return pdfUrl; }

    public void attachPdf(String pdfStorageKey, String pdfUrl) {
        this.pdfStorageKey = pdfStorageKey;
        this.pdfUrl = pdfUrl;
    }
}
