package com.example.backend1.ai.llm;

import com.example.backend1.ai.yolo.DefectClass;
import com.example.backend1.ai.yolo.YoloResponse;
import com.example.backend1.common.ApiException;
import com.example.backend1.diagnosis.service.RiskCalculator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * LLM 비전 탐지 결과가 기존 YoloResponse 스키마로 올바르게 변환되고,
 * 위험도 계산이 severity 기준으로 동작하는지 검증한다.
 *
 * <p>LLM 호출 자체는 목으로 대체하므로 API 키 없이 실행된다.
 */
class LlmVisionDetectorTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RiskCalculator riskCalculator = new RiskCalculator();

    private LlmVisionDetector detectorReturning(String llmJson) {
        OpenAiLlmClient client = mock(OpenAiLlmClient.class);
        when(client.chatWithImages(anyString(), anyString(), any())).thenReturn(llmJson);
        return new LlmVisionDetector(client, objectMapper);
    }

    private MockMultipartFile image() {
        return new MockMultipartFile("image", "wall.jpg", "image/jpeg", new byte[]{1, 2, 3});
    }

    @Test
    void LLM_응답을_YoloResponse_스키마로_변환한다() {
        LlmVisionDetector detector = detectorReturning("""
                {
                  "detections": [
                    {"label": "mold", "severity": "MEDIUM", "area_ratio": 0.12, "reason": "천장에 검은 반점"},
                    {"label": "crack", "severity": "HIGH", "area_ratio": 0.03, "reason": "벽면 대각선 균열"}
                  ]
                }
                """);

        YoloResponse result = detector.detect(image());

        assertThat(result.status()).isEqualTo("success");
        assertThat(result.count()).isEqualTo(2);
        assertThat(result.detections()).hasSize(2);

        YoloResponse.Detection mold = result.detections().get(0);
        assertThat(mold.label()).isEqualTo("mold");
        assertThat(mold.toDefectClass()).isEqualTo(DefectClass.MOLD);
        assertThat(mold.severity()).isEqualTo("MEDIUM");
        assertThat(mold.areaRatio()).isEqualTo(0.12);
        assertThat(mold.reason()).contains("검은 반점");

        // LLM 탐지는 좌표/마스크를 만들지 않고, 신뢰할 수 없는 confidence 도 비워둔다
        assertThat(mold.bbox()).isNull();
        assertThat(mold.maskArea()).isNull();
        assertThat(mold.confidence()).isNull();
    }

    @Test
    void 하자가_없으면_빈_목록을_반환한다() {
        LlmVisionDetector detector = detectorReturning("{\"detections\": []}");

        YoloResponse result = detector.detect(image());

        assertThat(result.count()).isZero();
        assertThat(result.detections()).isEmpty();
        // 위험도도 NONE 이어야 한다
        assertThat(riskCalculator.calculate(result).level()).isEqualTo("NONE");
    }

    @Test
    void 이상한_area_ratio_와_severity_를_방어한다() {
        LlmVisionDetector detector = detectorReturning("""
                {
                  "detections": [
                    {"label": "leak", "severity": "치명적", "area_ratio": 7.5},
                    {"label": "stain", "severity": null, "area_ratio": -0.4}
                  ]
                }
                """);

        YoloResponse result = detector.detect(image());

        // 범위를 벗어난 area_ratio 는 0~1 로 클램프
        assertThat(result.detections().get(0).areaRatio()).isEqualTo(1.0);
        assertThat(result.detections().get(1).areaRatio()).isEqualTo(0.0);
        // 알 수 없는 severity 는 MEDIUM 으로 정규화
        assertThat(result.detections().get(0).severity()).isEqualTo("MEDIUM");
        assertThat(result.detections().get(1).severity()).isEqualTo("MEDIUM");
    }

    @Test
    void 여러_장을_올리면_한_번의_호출로_모두_전달된다() {
        OpenAiLlmClient client = mock(OpenAiLlmClient.class);
        when(client.chatWithImages(anyString(), anyString(), any()))
                .thenReturn("{\"detections\": [{\"label\": \"crack\", \"severity\": \"HIGH\", \"area_ratio\": 0.2}]}");
        LlmVisionDetector detector = new LlmVisionDetector(client, objectMapper);

        YoloResponse result = detector.detect(List.of(image(), image(), image()));

        // 사진 3장이 한 번의 호출로 넘어가야 한다 (장당 호출이면 비용/시간이 3배가 된다)
        ArgumentCaptor<List<OpenAiLlmClient.ImagePart>> captor = ArgumentCaptor.forClass(List.class);
        verify(client, times(1)).chatWithImages(anyString(), anyString(), captor.capture());
        assertThat(captor.getValue()).hasSize(3);

        // 장수와 무관하게 결과는 하나로 종합된다
        assertThat(result.detections()).hasSize(1);
        assertThat(result.detections().get(0).label()).isEqualTo("crack");
    }

    @Test
    void 빈_이미지_목록이면_예외를_던진다() {
        LlmVisionDetector detector = detectorReturning("{\"detections\": []}");

        assertThatThrownBy(() -> detector.detect(List.<org.springframework.web.multipart.MultipartFile>of()))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void 파싱_불가능한_응답이면_예외를_던진다() {
        LlmVisionDetector detector = detectorReturning("죄송합니다, 사진을 분석할 수 없습니다.");

        assertThatThrownBy(() -> detector.detect(image()))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void severity_가_높을수록_위험도가_높아진다() {
        String template = """
                {"detections": [{"label": "crack", "severity": "%s", "area_ratio": 0.1}]}
                """;

        double low = riskCalculator.calculate(detectorReturning(template.formatted("LOW")).detect(image())).score();
        double medium = riskCalculator.calculate(detectorReturning(template.formatted("MEDIUM")).detect(image())).score();
        double high = riskCalculator.calculate(detectorReturning(template.formatted("HIGH")).detect(image())).score();

        assertThat(low).isLessThan(medium);
        assertThat(medium).isLessThan(high);
        assertThat(low).isBetween(0.0, 1.0);
        assertThat(high).isBetween(0.0, 1.0);
    }

    @Test
    void 과거_YOLO_데이터도_confidence_로_계속_계산된다() throws Exception {
        // severity 필드가 없던 시절의 저장 데이터
        YoloResponse legacy = objectMapper.readValue("""
                {
                  "status": "success",
                  "count": 1,
                  "detections": [
                    {"label": "leak", "confidence": 0.9, "bbox": [1,2,3,4], "area_ratio": 0.2}
                  ]
                }
                """, YoloResponse.class);

        RiskCalculator.RiskResult risk = riskCalculator.calculate(legacy);

        assertThat(risk.mainDefect()).isEqualTo(DefectClass.LEAK);
        assertThat(risk.score()).isGreaterThan(0.0);
        assertThat(risk.level()).isIn("LOW", "MEDIUM", "HIGH");
    }
}
