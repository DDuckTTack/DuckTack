package com.example.backend1.ai;

import com.example.backend1.diagnosis.domain.IssueType;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class DecisionService {

    public FinalDecision evaluate(AiRawResponse raw) {
        // 1) AI 결과 기본값 정리
        String issueType = raw != null && raw.issueType() != null ? raw.issueType() : "ETC";
        String subType = raw != null ? raw.subType() : null;
        int riskScore = raw != null && raw.riskScore() != null ? raw.riskScore() : 0;
        double confidence = raw != null && raw.confidence() != null ? raw.confidence() : 0.0;
        String aiAction = raw != null && raw.recommendedAction() != null ? raw.recommendedAction() : "DIY";
        Boolean diyPossible = raw != null ? raw.diyPossible() : null;
        String summary = raw != null && raw.summary() != null ? raw.summary() : "AI 분석 결과가 생성되었습니다.";

        List<String> reasons = new ArrayList<>();
        if (raw != null && raw.reasons() != null) reasons.addAll(raw.reasons());

        List<String> cautionNotes = new ArrayList<>();
        if (raw != null && raw.cautionNotes() != null) cautionNotes.addAll(raw.cautionNotes());

        // 2) 기본 판단은 AI 결과를 따름
        Action finalAction = toAction(aiAction);

        // 3) 안전 보정 규칙
        // (1) 신뢰도 너무 낮으면 재촬영 권장
        if (confidence < 0.40) {
            finalAction = Action.RECHECK;
            reasons.add("이미지 신뢰도가 낮아 재촬영 또는 추가 촬영이 필요합니다.");
        }

        // (2) 위험도 매우 높으면 전문가 우선
        if (riskScore >= 80) {
            finalAction = Action.PRO;
            reasons.add("위험도가 높아 전문가 점검이 권장됩니다.");
        }

        // (3) 특정 위험군은 보수적으로 전문가 우선
        if (isHighRiskIssue(issueType, subType, riskScore)) {
            finalAction = Action.PRO;
            reasons.add("안전상 위험 가능성이 있어 전문가 확인이 필요합니다.");
        }

        // (4) AI가 DIY라 해도 diyPossible=false면 전문가 또는 재확인
        if (finalAction == Action.DIY && Boolean.FALSE.equals(diyPossible)) {
            finalAction = Action.PRO;
            reasons.add("DIY 가능 여부가 낮게 판단되어 전문가 조치를 권장합니다.");
        }

        // 4) 예상 견적(초기 버전)
        Estimate estimate = buildEstimate(finalAction, riskScore);

        return new FinalDecision(
                issueType,
                subType,
                riskScore,
                confidence,
                finalAction.name(),
                summary,
                reasons,
                cautionNotes,
                estimate
        );
    }

    private Action toAction(String value) {
        try {
            return Action.valueOf(value.toUpperCase());
        } catch (Exception e) {
            return Action.DIY;
        }
    }

    private boolean isHighRiskIssue(String issueType, String subType, int riskScore) {
        // 대분류 기준 최소 안전 필터
        if ("LEAK".equalsIgnoreCase(issueType) && riskScore >= 60) return true;
        if ("CRACK".equalsIgnoreCase(issueType) && riskScore >= 70) return true;

        // 세부 유형 기준 보수적 필터
        if (subType == null) return false;

        return switch (subType.toUpperCase()) {
            case "CEILING_WATER_STAIN",
                 "ELECTRICAL_NEAR_LEAK",
                 "STRUCTURAL_CRACK",
                 "WIDE_CRACK" -> true;
            default -> false;
        };
    }

    private Estimate buildEstimate(Action action, int riskScore) {
        if (action == Action.DIY) {
            int min = 10000;
            int max = 50000;
            return new Estimate("LOW", min, max);
        }

        if (action == Action.RECHECK) {
            return new Estimate("UNKNOWN", 0, 0);
        }

        // PRO
        if (riskScore >= 80) return new Estimate("HIGH", 150000, 400000);
        if (riskScore >= 60) return new Estimate("MEDIUM", 80000, 200000);
        return new Estimate("MEDIUM", 50000, 150000);
    }

    public enum Action {
        DIY, PRO, RECHECK
    }

    public record Estimate(
            String level,
            int minWon,
            int maxWon
    ) {}

    public record FinalDecision(
            String issueType,
            String subType,
            int riskScore,
            double confidence,
            String finalAction,
            String summary,
            List<String> reasons,
            List<String> cautionNotes,
            Estimate estimate
    ) {}
}