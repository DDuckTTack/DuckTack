package com.example.backend1.report.entity;

import com.example.backend1.diagnosis.domain.Diagnosis;
import com.example.backend1.diagnosis.domain.DiagnosisResult;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * 사용자가 수리 완료 후 입력하는 후입력 정보(드래프트).
 */
@Entity
@Table(name = "report_draft")
public class ReportDraft {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 구 파이프라인 진단 */
    @OneToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "diagnosis_id", unique = true, nullable = true)
    private Diagnosis diagnosis;

    /** 새 파이프라인 진단 결과 */
    @OneToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "diagnosis_result_id", unique = true, nullable = true)
    private DiagnosisResult diagnosisResult;

    /** 수리 방식 (DIY / PRO) */
    @Column(length = 200)
    private String repairMethod;

    /** 수리 완료일 */
    private LocalDate completionDate;

    /** 업체명 */
    @Column(length = 200)
    private String contractorName;

    /** 업체 연락처 */
    @Column(length = 100)
    private String contractorContact;

    /** 실제 작업 요약 */
    @Column(length = 2000)
    private String repairSummary;

    /** 총 비용(숫자형) */
    private Integer actualCostKrw;

    /** 사용자 메모 */
    @Column(length = 2000)
    private String notes;

    /** 총 비용(문자열 입력값) */
    @Column(length = 100)
    private String totalCost;

    /**
     * 레거시 필드.
     * 화면/PDF에서는 더 이상 사용하지 않는다.
     * 기존 DB 컬럼 호환을 위해 남겨둔다.
     */
    @Column(length = 100)
    private String materialCost;

    /**
     * 레거시 필드.
     * 화면/PDF에서는 더 이상 사용하지 않는다.
     * 기존 DB 컬럼 호환을 위해 남겨둔다.
     */
    @Column(length = 100)
    private String laborCost;

    /** DIY 사용 자재 */
    @Column(length = 1000)
    private String diyMaterialsUsed;

    /** DIY 자재비 */
    @Column(length = 100)
    private String diyMaterialCost;

    /** DIY 작업 메모 */
    @Column(length = 2000)
    private String diyWorkMemo;

    @Column(nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    protected ReportDraft() {}

    public ReportDraft(Diagnosis diagnosis) {
        this.diagnosis = diagnosis;
    }

    public ReportDraft(DiagnosisResult diagnosisResult) {
        this.diagnosisResult = diagnosisResult;
    }

    public Long getId() { return id; }
    public Diagnosis getDiagnosis() { return diagnosis; }
    public DiagnosisResult getDiagnosisResult() { return diagnosisResult; }
    public String getRepairMethod() { return repairMethod; }
    public LocalDate getCompletionDate() { return completionDate; }
    public String getContractorName() { return contractorName; }
    public String getContractorContact() { return contractorContact; }
    public String getRepairSummary() { return repairSummary; }
    public Integer getActualCostKrw() { return actualCostKrw; }
    public String getNotes() { return notes; }
    public String getTotalCost() { return totalCost; }
    public String getMaterialCost() { return materialCost; }
    public String getLaborCost() { return laborCost; }
    public String getDiyMaterialsUsed() { return diyMaterialsUsed; }
    public String getDiyMaterialCost() { return diyMaterialCost; }
    public String getDiyWorkMemo() { return diyWorkMemo; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }

    public void setTotalCost(String totalCost) {
        this.totalCost = totalCost;
        this.updatedAt = OffsetDateTime.now();
    }

    public void update(
            String repairMethod,
            LocalDate completionDate,
            String contractorName,
            String contractorContact,
            String repairSummary,
            Integer actualCostKrw,
            String notes,
            String totalCost,
            String diyMaterialsUsed,
            String diyMaterialCost,
            String diyWorkMemo
    ) {
        this.repairMethod = repairMethod;
        this.completionDate = completionDate;
        this.contractorName = contractorName;
        this.contractorContact = contractorContact;
        this.repairSummary = repairSummary;
        this.actualCostKrw = actualCostKrw;
        this.notes = notes;
        this.totalCost = totalCost;

        // 재료비/인건비는 더 이상 사용하지 않는다.
        this.materialCost = null;
        this.laborCost = null;

        this.diyMaterialsUsed = diyMaterialsUsed;
        this.diyMaterialCost = diyMaterialCost;
        this.diyWorkMemo = diyWorkMemo;

        this.updatedAt = OffsetDateTime.now();
    }
}
