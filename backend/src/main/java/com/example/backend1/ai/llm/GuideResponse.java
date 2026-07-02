package com.example.backend1.ai.llm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Collections;
import java.util.List;

/**
 * OpenAI LLM 이 생성한 DIY 가이드 + 자재 추천 응답 DTO.
 *
 * <p>LLM 에 강제하는 JSON 스키마 (system prompt 에 지시):
 * <pre>
 * {
 *   "guide": {
 *     "title": "...",
 *     "summary": "...",
 *     "difficulty": "easy" | "medium" | "hard",
 *     "estimated_time_min": 30,
 *     "steps": [{"order":1,"title":"...","description":"...","warning":null}],
 *     "warnings": ["..."],
 *     "next_action": "DIY_OK" | "RECALL_IN_24H" | "CALL_PRO"
 *   },
 *   "products": [
 *     {"name":"...","category":"...","search_keyword":"...","reason":"...","quantity":1}
 *   ]
 * }
 * </pre>
 *
 * <p>모든 record 에 {@code @JsonIgnoreProperties(ignoreUnknown = true)} 를 둬서 LLM 이 추가 필드를
 * 보내거나 일부 필드를 누락해도 파싱 실패하지 않도록 했다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record GuideResponse(
        Guide guide,
        List<RecommendedProduct> products
) {

    public List<RecommendedProduct> productsOrEmpty() {
        return products == null ? Collections.emptyList() : products;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Guide(
            String title,
            String summary,
            String difficulty,                                  // "easy" | "medium" | "hard"
            @JsonProperty("estimated_time_min") Integer estimatedTimeMin,
            List<Step> steps,
            List<String> warnings,
            @JsonProperty("next_action") String nextAction      // "DIY_OK" | "RECALL_IN_24H" | "CALL_PRO"
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Step(
            Integer order,
            String title,
            String description,
            String warning                                      // 선택, null 가능
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RecommendedProduct(
            String name,
            String category,
            @JsonProperty("search_keyword") String searchKeyword,
            String reason,
            Integer quantity,
            @JsonProperty("estimated_price") Integer estimatedPrice
    ) {}

    /**
     * LLM 호출 실패 시 보여줄 fallback 가이드.
     * 위험도 등급에 따라 안전한 기본 안내만 제공.
     */
    public static GuideResponse fallback(String riskLevel) {
        boolean isHigh = "HIGH".equalsIgnoreCase(riskLevel);
        Guide guide = new Guide(
                isHigh ? "전문가 점검 권장" : "임시 점검 안내",
                isHigh
                        ? "AI 분석 결과 위험도가 높게 측정되었습니다. 안전을 위해 전문가 출장 점검을 권장합니다."
                        : "AI 분석은 완료되었으나 가이드 생성 중 일시적 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
                "medium",
                10,
                List.of(
                        new Step(1, "현장 확인",
                                "추가 피해를 막기 위해 누수/전기/가스 등은 임시 차단 후 전문가에게 연락하세요.",
                                "감전·누수 위험 시 절대 직접 작업하지 마세요.")
                ),
                List.of("위험도가 높은 경우 즉시 전문가에게 문의해주세요."),
                isHigh ? "CALL_PRO" : "RECALL_IN_24H"
        );
        return new GuideResponse(guide, Collections.emptyList());
    }
}
