package com.example.backend1.report.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;
import java.util.List;

public class ReportDraftDto {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DraftRequest(
            String repairMethod,

            /** 수리 완료일: yyyy-MM-dd */
            String repairDate,
            String contractorName,
            String contractorContact,
            String repairSummary,
            Integer actualCostKrw,

            /** 화면/PDF에서는 "사용자 메모"로 표시 */
            String notes,

            /** 총 비용 문자열 입력값 */
            String totalCost,

            String diyMaterialsUsed,
            String diyMaterialCost,
            String diyWorkMemo,

            @JsonAlias("beforeImageKeys")
            List<String> beforeImageUris,

            @JsonAlias("afterImageKeys")
            List<String> afterImageUris
    ) {}

    public record DraftResponse(
            Long diagnosisId,
            String repairMethod,

            /** 수리 완료일: yyyy-MM-dd */
            String repairDate,
            String contractorName,
            String contractorContact,
            String repairSummary,
            Integer actualCostKrw,

            /** 화면/PDF에서는 "사용자 메모"로 표시 */
            String notes,

            /** 총 비용 문자열 입력값 */
            String totalCost,

            String diyMaterialsUsed,
            String diyMaterialCost,
            String diyWorkMemo,

            List<String> beforeImageUris,
            List<String> afterImageUris,

            LocalDateTime updatedAt
    ) {}
}
