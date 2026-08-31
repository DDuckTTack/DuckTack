package com.example.backend1.ai.yolo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * 하자 탐지 결과의 내부 공통 포맷.
 *
 * <p>원래는 YOLO 서버 응답 스키마였지만, 현재 탐지는 LLM 비전 모델
 * ({@code ai.llm.LlmVisionDetector})이 수행하고 같은 스키마로 변환해서 채운다.
 * 저장 포맷/응답 DTO/프론트 호환을 위해 이름과 구조는 그대로 유지한다.
 *
 * <p>LLM 탐지에서는 {@code bbox}, {@code maskArea}, {@code segmentationApplied} 가 비어있고,
 * 대신 {@code severity} 가 채워진다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record YoloResponse(
        String status,
        Integer count,
        List<Detection> detections
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Detection(
            String label,
            Double confidence,
            List<Integer> bbox,
            @JsonProperty("area_ratio") Double areaRatio,
            @JsonProperty("mask_area") Integer maskArea,
            @JsonProperty("segmentation_applied") Boolean segmentationApplied,

            /**
             * LLM 비전 탐지가 판단한 심각도 (LOW / MEDIUM / HIGH).
             *
             * <p>LLM 이 만들어내는 confidence 는 학습 기반 확률이 아니라 사실상 임의값이라
             * 위험도 계산에 쓰기에 부적절하다. 대신 이 이산적인 심각도를 쓴다.
             * 기존 YOLO 로 생성된 과거 데이터에는 이 값이 없어 {@code null} 이다.
             */
            String severity,

            /** LLM 이 그렇게 판단한 근거. 사용자에게 보여주거나 디버깅에 쓴다. */
            String reason
    ) {
        public DefectClass toDefectClass() {
            return DefectClass.fromLabel(label);
        }
    }
}
