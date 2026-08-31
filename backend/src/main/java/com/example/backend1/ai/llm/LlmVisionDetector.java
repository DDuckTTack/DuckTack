package com.example.backend1.ai.llm;

import com.example.backend1.ai.yolo.YoloResponse;
import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * LLM 비전 모델로 주거 하자를 탐지한다. (기존 YOLO + SAM 서버를 대체)
 *
 * <p>결과는 기존 {@link YoloResponse} 스키마로 변환해서 돌려주므로
 * RiskCalculator / DiagnosisResult / 응답 DTO / 프론트는 그대로 동작한다.
 *
 * <p>YOLO 대비 차이:
 * <ul>
 *   <li>bbox / mask 를 만들지 않는다 (현재 앱에서 시각화하지 않으므로 미사용)</li>
 *   <li>area_ratio 는 픽셀 마스크 계산이 아니라 LLM 의 추정치다</li>
 *   <li>confidence 대신 severity(LOW/MEDIUM/HIGH) 로 심각도를 표현한다</li>
 * </ul>
 */
@Component
public class LlmVisionDetector {

    private static final Logger log = LoggerFactory.getLogger(LlmVisionDetector.class);

    /** DefectClass 가 알아듣는 라벨만 허용한다. 그 외는 other 로 떨어진다. */
    private static final String SYSTEM_PROMPT = """
            너는 한국 주거 하자를 사진으로 판별하는 검사 AI다.
            입력 사진에서 실제로 보이는 하자만 찾아 JSON 으로 보고한다.

            label 은 반드시 아래 중 하나만 사용한다:
            leak(누수), mold(곰팡이), crack(균열), peel(박리/벗겨짐), corrosion(부식/녹),
            bulge(들뜸), stain(얼룩), damage(파손), electric(전기 관련), gas(가스 관련), other(기타)

            severity 는 아래 기준으로 판단한다:
            - HIGH   : 즉시 조치가 필요하거나 안전/구조에 영향 (진행성 누수, 전기·가스 이상, 큰 구조 균열 등)
            - MEDIUM : 방치하면 악화되는 상태 (곰팡이 확산, 중간 규모 균열, 마감재 들뜸 등)
            - LOW    : 미관 문제이거나 경미한 초기 상태

            area_ratio 는 해당 하자가 사진 전체 면적에서 차지하는 비율의 추정치다 (0.0 ~ 1.0).
            정확한 측정이 아니어도 되지만, 눈에 보이는 크기에 맞게 보수적으로 추정한다.

            반드시 아래 JSON 스키마로만 응답한다. 다른 텍스트는 절대 포함하지 않는다.
            {
              "detections": [
                {
                  "label": "<위 목록 중 하나>",
                  "severity": "LOW" | "MEDIUM" | "HIGH",
                  "area_ratio": <0.0 ~ 1.0 사이 실수>,
                  "reason": "<그렇게 판단한 근거를 한국어 한 문장으로>"
                }
              ]
            }

            판단 원칙:
            - 사진이 여러 장이면 같은 하자를 다른 각도/거리에서 찍은 것이다.
              장별로 따로 세지 말고, 모든 사진을 종합해서 하나의 결과로 판단한다.
            - 사진에 하자가 없거나 판별이 불가능하면 detections 를 빈 배열로 반환한다.
            - 확실하지 않은 것을 억지로 만들어내지 않는다. 없으면 없다고 한다.
            - 같은 종류의 하자가 여러 군데 있으면 하나로 묶어서 보고한다.
            - 최대 5개까지만 보고한다.
            """;

    private static final String USER_PROMPT_SINGLE =
            "이 사진에서 보이는 주거 하자를 위 스키마대로 JSON 으로만 보고해줘.";

    private static final String USER_PROMPT_MULTI =
            "아래 사진들은 같은 하자를 여러 각도에서 찍은 것이다. "
            + "모두 종합해서 보이는 주거 하자를 위 스키마대로 JSON 으로만 보고해줘.";

    private final OpenAiLlmClient llmClient;
    private final ObjectMapper objectMapper;

    public LlmVisionDetector(OpenAiLlmClient llmClient, ObjectMapper objectMapper) {
        this.llmClient = llmClient;
        this.objectMapper = objectMapper;
    }

    /**
     * 이미지 1장에서 하자를 탐지한다.
     *
     * @throws ApiException LLM 호출/파싱 실패 시. (기존 YOLO 와 동일하게 fail-fast)
     */
    public YoloResponse detect(MultipartFile image) {
        return detect(List.of(image));
    }

    /**
     * 여러 장을 한 번에 분석한다. 같은 하자를 여러 각도에서 찍은 사진이라고 보고
     * 한 번의 LLM 호출로 종합 판단한다.
     */
    public YoloResponse detect(List<MultipartFile> images) {
        if (images == null || images.isEmpty()) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "이미지를 업로드해주세요.");
        }

        List<OpenAiLlmClient.ImagePart> parts = new ArrayList<>();
        for (MultipartFile image : images) {
            if (image == null || image.isEmpty()) continue;
            try {
                parts.add(new OpenAiLlmClient.ImagePart(image.getBytes(), image.getContentType()));
            } catch (IOException e) {
                throw new ApiException(ErrorCode.FILE_READ_FAILED);
            }
        }

        if (parts.isEmpty()) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "이미지를 업로드해주세요.");
        }

        String userPrompt = parts.size() > 1 ? USER_PROMPT_MULTI : USER_PROMPT_SINGLE;

        String json;
        try {
            json = llmClient.chatWithImages(SYSTEM_PROMPT, userPrompt, parts);
        } catch (ApiException e) {
            log.warn("[LlmVisionDetector] LLM 비전 호출 실패 (이미지 {}장): {}", parts.size(), e.getMessage());
            throw e;
        }

        VisionResult parsed;
        try {
            parsed = objectMapper.readValue(json, VisionResult.class);
        } catch (Exception e) {
            log.warn("[LlmVisionDetector] 응답 JSON 파싱 실패. raw={}", abbreviate(json), e);
            throw new ApiException(ErrorCode.LLM_FAILED, "하자 분석 결과를 해석하지 못했습니다.");
        }

        List<YoloResponse.Detection> detections = toDetections(parsed);

        log.info("[LlmVisionDetector] 이미지 {}장 → 탐지 {}건 {}", parts.size(), detections.size(),
                detections.stream().map(d -> d.label() + "/" + d.severity()).toList());

        return new YoloResponse("success", detections.size(), detections);
    }

    private List<YoloResponse.Detection> toDetections(VisionResult parsed) {
        List<YoloResponse.Detection> result = new ArrayList<>();

        if (parsed == null || parsed.detections() == null) {
            return result;
        }

        for (VisionDetection d : parsed.detections()) {
            if (d == null || d.label() == null || d.label().isBlank()) continue;

            String severity = normalizeSeverity(d.severity());

            result.add(new YoloResponse.Detection(
                    d.label().trim().toLowerCase(Locale.ROOT),
                    null,                       // confidence: LLM 은 신뢰할 만한 확률을 못 주므로 비운다
                    null,                       // bbox: LLM 탐지에서는 좌표를 만들지 않는다
                    clampAreaRatio(d.areaRatio()),
                    null,                       // maskArea
                    Boolean.FALSE,              // segmentationApplied
                    severity,
                    d.reason()
            ));
        }

        return result;
    }

    private String normalizeSeverity(String raw) {
        if (raw == null) return "MEDIUM";

        return switch (raw.trim().toUpperCase(Locale.ROOT)) {
            case "HIGH" -> "HIGH";
            case "LOW" -> "LOW";
            default -> "MEDIUM";
        };
    }

    /** LLM 이 1.0 초과나 음수를 뱉는 경우가 있어 방어한다. */
    private Double clampAreaRatio(Double raw) {
        if (raw == null || raw.isNaN()) return null;
        return Math.min(Math.max(raw, 0.0), 1.0);
    }

    private String abbreviate(String s) {
        if (s == null) return "null";
        return s.length() <= 500 ? s : s.substring(0, 500) + "...";
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VisionResult(List<VisionDetection> detections) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VisionDetection(
            String label,
            String severity,
            @JsonProperty("area_ratio") Double areaRatio,
            String reason
    ) {}
}
