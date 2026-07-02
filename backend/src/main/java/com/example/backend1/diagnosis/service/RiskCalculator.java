package com.example.backend1.diagnosis.service;

import com.example.backend1.ai.yolo.DefectClass;
import com.example.backend1.ai.yolo.YoloResponse;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * YOLO detection 결과를 위험도 점수/등급으로 환산하는 백엔드 자체 로직.
 */
@Service
public class RiskCalculator {

    /**
     * 결함 종류별 기본 위험 가중치.
     *
     * 1.0에 가까울수록 위험도가 높은 결함.
     */
    private static final Map<DefectClass, Double> SEVERITY_WEIGHT = Map.ofEntries(
            Map.entry(DefectClass.LEAK, 1.0),        // 누수
            Map.entry(DefectClass.GAS, 1.0),         // 가스
            Map.entry(DefectClass.ELECTRIC, 0.95),   // 전기
            Map.entry(DefectClass.CRACK, 0.80),      // 균열
            Map.entry(DefectClass.CORROSION, 0.70),  // 부식
            Map.entry(DefectClass.MOLD, 0.65),       // 곰팡이
            Map.entry(DefectClass.BULGE, 0.60),      // 들뜸
            Map.entry(DefectClass.DAMAGE, 0.65),     // 파손
            Map.entry(DefectClass.PEEL, 0.55),       // 벗겨짐
            Map.entry(DefectClass.STAIN, 0.25),      // 얼룩
            Map.entry(DefectClass.OTHER, 0.50)
    );

    /**
     * 단일 detection 위험 점수.
     */
    private double detectionScore(YoloResponse.Detection d) {
        DefectClass cls = d.toDefectClass();

        double base = SEVERITY_WEIGHT.getOrDefault(cls, 0.5);
        double conf = d.confidence() == null ? 0.5 : d.confidence();
        double area = d.areaRatio() == null ? 0.1 : d.areaRatio();

        // 면적이 클수록 위험 가중치 1.0~1.3배 보정
        double areaBoost = 1.0 + Math.min(Math.max(area, 0.0) * 1.0, 0.3);

        // confidence 낮은 가중치로 반영 (0.5~1.0 범위)
        double confFactor = 0.5 + (conf * 0.5);

        return base * areaBoost * confFactor;
    }

    /**
     * YOLO 응답 → 종합 위험도 산출.
     */
    public RiskResult calculate(YoloResponse yolo) {
        if (yolo == null || yolo.detections() == null || yolo.detections().isEmpty()) {
            return new RiskResult(0.0, "NONE", DefectClass.OTHER, 0);
        }

        List<YoloResponse.Detection> detections = yolo.detections();

        YoloResponse.Detection main = detections.stream()
                .max(Comparator.comparingDouble(this::detectionScore))
                .orElse(detections.get(0));

        double mainScore = detectionScore(main);

        double secondaryScore = detections.stream()
                .filter(d -> d != main)
                .mapToDouble(d -> detectionScore(d) * 0.3)
                .sum();

        // 복합 결함 시너지 (2개 이상이면 1.1배, 3개 이상이면 1.2배)
        double synergyBoost = detections.size() >= 3 ? 1.2 : detections.size() == 2 ? 1.1 : 1.0;

        double raw = mainScore + secondaryScore;
        double total = 1.0 - Math.exp(-raw * synergyBoost * 2.5);

        String level;
        if (total >= 0.78) {
            level = "HIGH";
        } else if (total >= 0.45) {
            level = "MEDIUM";
        } else {
            level = "LOW";
        }

        DefectClass mainDefect = main.toDefectClass();

        return new RiskResult(total, level, mainDefect, detections.size());
    }

    public record RiskResult(
            double score,
            String level,
            DefectClass mainDefect,
            int detectionCount
    ) {
        public int score100() {
            return (int) Math.round(score * 100);
        }
    }
}