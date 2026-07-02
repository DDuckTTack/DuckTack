package com.example.backend1.diagnosis.service;

import com.example.backend1.ai.yolo.YoloResponse;
import com.example.backend1.user.domain.User;

/**
 * OpenAI Chat Completion 호출 시 system / user 프롬프트를 만든다.
 *
 * 핵심 정책:
 * - LLM은 DIY 가이드만 생성한다.
 * - 추천 물품/자재/쿠팡 링크는 LLM이 생성하지 않는다.
 * - 물품 추천은 products DB + 쿠팡 파트너스 링크 기준으로만 처리한다.
 */
final class PromptBuilder {

    private PromptBuilder() {}

    static String systemPrompt() {
        return """
                너는 한국의 집수리 전문 AI 어시스턴트야.
                YOLO 객체 탐지 모델이 감지한 주거 하자 정보와 사용자 컨텍스트를 받아서,
                사용자가 이해하기 쉬운 DIY 대응 가이드를 작성해.

                매우 중요:
                - 추천 물품, 추천 자재, 상품명, 구매 링크, 쿠팡 검색어는 절대 만들지 마.
                - 제품 추천은 다른 시스템에서 DB 기준으로 처리한다.
                - 너는 원인 설명, 위험성, DIY 가능 여부, 진행 순서, 주의사항만 작성한다.

                반드시 아래 JSON 스키마로만 응답해. 다른 텍스트는 절대 포함하지 마.
                {
                  "guide": {
                    "title": "<진단 제목, 한국어>",
                    "summary": "<2~3문장의 핵심 요약, 한국어>",
                    "difficulty": "easy" | "medium" | "hard",
                    "estimated_time_min": <정수 분>,
                    "steps": [
                      {
                        "order": 1,
                        "title": "<단계명>",
                        "description": "<사용자가 따라할 수 있는 구체적인 설명>",
                        "warning": null
                      }
                    ],
                    "warnings": ["<주의사항>"],
                    "next_action": "DIY_OK" | "RECALL_IN_24H" | "CALL_PRO"
                  }
                }

                작성 원칙:
                - steps는 3~6단계로 작성한다.
                - 각 단계는 실제 사용자가 따라할 수 있게 구체적으로 작성한다.
                - 위험도가 HIGH 이거나 누수/전기/가스 관련이면 next_action은 CALL_PRO를 우선 권장한다.
                - 단, 사용자가 DIY 방법을 직접 요청한 경우에는 전문가 권장 문구를 포함하되 DIY 단계도 제공한다.
                - 안전을 과장하지 말고, 불확실하면 전문가 점검을 권장한다.
                - 전문 용어만 쓰지 말고 일반 사용자가 이해할 수 있는 표현으로 작성한다.
                - 추천 물품, 상품명, 가격, 쿠팡, 구매 링크, 검색어는 절대 작성하지 않는다.
                """;
    }

    static String userPrompt(YoloResponse yolo, RiskCalculator.RiskResult risk, User user) {
        return userPrompt(yolo, risk, user, false);
    }

    static String userPrompt(YoloResponse yolo, RiskCalculator.RiskResult risk, User user, boolean preferDiy) {
        StringBuilder sb = new StringBuilder();

        sb.append("=== AI 객체 탐지 결과 ===\n");
        sb.append("주요 결함: ").append(risk.mainDefect()).append("\n");
        sb.append("위험도 등급: ").append(risk.level()).append("\n");
        sb.append(String.format("위험도 점수: %.2f (0~1 스케일)%n", risk.score()));
        sb.append("감지된 결함 개수: ").append(risk.detectionCount()).append("\n\n");

        sb.append("감지된 모든 결함:\n");
        if (yolo != null && yolo.detections() != null) {
            for (YoloResponse.Detection d : yolo.detections()) {
                sb.append("- class=").append(d.toDefectClass().code());
                sb.append(", confidence=").append(d.confidence());
                sb.append(", area_ratio=").append(d.areaRatio() == null ? "N/A" : d.areaRatio());
                sb.append("\n");
            }
        }

        sb.append("\n=== 사용자 컨텍스트 ===\n");
        sb.append("거주 형태: ").append(user.getResidenceType()).append("\n");
        sb.append("임대 형태: ").append(user.getRentType()).append("\n");

        if (preferDiy) {
            sb.append("\n=== 사용자 요청 ===\n");
            sb.append("사용자가 위험도와 관계없이 DIY 방법을 직접 확인하고 싶어 함.\n");
            sb.append("전문가 점검이 필요한 상황이면 그 사실을 명확히 말하되, ");
            sb.append("사용자가 안전하게 확인하거나 임시 대응할 수 있는 DIY 단계도 함께 제공해.\n");
            sb.append("이 경우 next_action은 DIY_OK 또는 RECALL_IN_24H로 설정해. CALL_PRO는 사용하지 마.\n");
        }

        sb.append("\n위 정보를 바탕으로 DIY 대응 가이드만 JSON으로 응답해.");
        sb.append("\n추천 물품, 자재, 상품명, 구매 링크, 쿠팡 검색어는 절대 포함하지 마.");

        return sb.toString();
    }
}