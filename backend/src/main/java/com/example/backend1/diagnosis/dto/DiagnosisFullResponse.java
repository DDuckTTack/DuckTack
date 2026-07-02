package com.example.backend1.diagnosis.dto;

import com.example.backend1.ai.llm.GuideResponse;
import com.example.backend1.ai.yolo.YoloResponse;
import com.example.backend1.diagnosis.domain.DiagnosisResult;
import com.example.backend1.diagnosis.domain.IssueType;
import com.example.backend1.diagnosis.service.RiskCalculator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.OffsetDateTime;

/**
 * AI 진단 (YOLO + 위험도 + LLM 가이드) 통합 응답.
 *
 * <p>프론트에서 화면 한 번에 그릴 수 있게 모든 정보를 묶어 내려준다.
 */
public record DiagnosisFullResponse(
        Long diagnosisId,
        String imageUrl,
        OffsetDateTime createdAt,

        // 진단 결과 요약
        IssueType issueType,
        String mainDefect,
        Double riskScore,           // 0.0 ~ 1.0
        Integer riskScore100,       // 0 ~ 100 (기존 호환)
        String riskLevel,           // NONE / LOW / MEDIUM / HIGH
        Integer detectionCount,

        // 원본 detection 배열 (프론트가 bbox 그릴 수 있게)
        YoloResponse yolo,

        // LLM 가이드
        GuideResponse guide,
        boolean guideFallback
) {

    /** orchestrator 가 모은 정보로 응답 빌드 (DB 저장 직후). */
    public static DiagnosisFullResponse of(
            DiagnosisResult saved,
            YoloResponse yolo,
            RiskCalculator.RiskResult risk,
            GuideResponse guide
    ) {
        return new DiagnosisFullResponse(
                saved.getId(),
                saved.getImageUrl(),
                saved.getCreatedAt(),
                saved.getIssueType(),
                saved.getMainDefect(),
                risk == null ? 0.0 : risk.score(),
                risk == null ? 0   : risk.score100(),
                risk == null ? "NONE" : risk.level(),
                risk == null ? 0   : risk.detectionCount(),
                yolo,
                guide,
                saved.isGuideFallback()
        );
    }

    /** DB 에서 로드한 결과를 다시 응답으로 풀어줄 때 사용 (GET /api/diagnosis/{id}). */
    public static DiagnosisFullResponse fromEntity(DiagnosisResult e, ObjectMapper mapper) {
        YoloResponse yolo = parseOrNull(e.getYoloRawJson(), YoloResponse.class, mapper);
        GuideResponse guide = parseOrNull(e.getGuideJson(), GuideResponse.class, mapper);

        Double score = e.getRiskScore();
        Integer score100 = score == null ? 0 : (int) Math.round(score * 100);

        int detections = 0;
        if (yolo != null && yolo.detections() != null) {
            detections = yolo.detections().size();
        }

        return new DiagnosisFullResponse(
                e.getId(),
                e.getImageUrl(),
                e.getCreatedAt(),
                e.getIssueType(),
                e.getMainDefect(),
                score,
                score100,
                e.getRiskLevel(),
                detections,
                yolo,
                guide,
                e.isGuideFallback()
        );
    }

    private static <T> T parseOrNull(String json, Class<T> cls, ObjectMapper mapper) {
        if (json == null || json.isBlank()) return null;
        try {
            // GuideResponse / YoloResponse 모두 record 라서 그대로 파싱 가능
            return mapper.readValue(json, cls);
        } catch (Exception ex) {
            return null;
        }
    }

    /** Jackson 이 일반 JsonNode 가 더 편할 때를 위해 헬퍼 (현재 미사용). */
    @SuppressWarnings("unused")
    private static JsonNode toNode(String json, ObjectMapper mapper) {
        try {
            return json == null ? null : mapper.readTree(json);
        } catch (Exception e) {
            return null;
        }
    }
}
