package com.example.backend1.ai.llm;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * OpenAI 호환 Chat Completion 클라이언트.
 *
 * <p>다음 공급자 모두 동일한 클라이언트로 호출 가능 (URL/모델/키만 다름):
 * <ul>
 *   <li>Google Gemini   — base-url: {@code https://generativelanguage.googleapis.com/v1beta/openai}
 *                         model: {@code gemini-2.5-flash}, {@code gemini-2.5-pro}, {@code gemini-flash-latest}</li>
 *   <li>OpenAI          — base-url: {@code https://api.openai.com/v1}
 *                         model: {@code gpt-4o-mini}, {@code gpt-4o}</li>
 *   <li>그 외 OpenAI 호환 API — Together AI, Fireworks, vLLM 자체 호스팅 등</li>
 * </ul>
 *
 * <p>응답은 {@code response_format=json_object} 로 강제하여 항상 JSON 문자열 반환.
 * <p>API 키는 절대 yml/git 에 박지 말고 환경변수로 주입한다.
 */
@Component
public class OpenAiLlmClient {

    private static final Logger log = LoggerFactory.getLogger(OpenAiLlmClient.class);

    private final RestTemplate restTemplate;
    private final String baseUrl;
    private final String apiKey;
    private final String model;
    private final double temperature;
    private final int maxTokens;

    public OpenAiLlmClient(
            @Qualifier("openAiRestTemplate") RestTemplate restTemplate,
            // ⭐ 어떤 공급자를 쓰든 OpenAI 호환 base URL 만 넣으면 됨
            //   기본값: Gemini (무료 한도 사용)
            @Value("${llm.base-url:https://generativelanguage.googleapis.com/v1beta/openai}") String baseUrl,
            @Value("${llm.api-key:}") String apiKey,
            @Value("${llm.model:gemini-2.5-flash}") String model,
            @Value("${llm.temperature:0.3}") double temperature,
            @Value("${llm.max-tokens:2000}") int maxTokens
    ) {
        this.restTemplate = restTemplate;
        // 마지막 슬래시 정리 — 호출부에서 "/chat/completions" 를 붙이기 때문
        this.baseUrl = (baseUrl == null) ? "" : baseUrl.replaceAll("/+$", "");
        this.apiKey = apiKey == null ? "" : apiKey;
        this.model = model;
        this.temperature = temperature;
        this.maxTokens = maxTokens;
    }

    /**
     * Chat Completion 호출.
     *
     * @param systemPrompt 역할/스키마 가이드
     * @param userPrompt   진단 결과 + 컨텍스트
     * @return LLM 이 생성한 JSON 문자열 (호출부에서 ObjectMapper 로 파싱)
     */
    public String chat(String systemPrompt, String userPrompt) {
        return call(systemPrompt, userPrompt, null);
    }

    /**
     * 이미지를 함께 보내는 비전 호출.
     *
     * <p>OpenAI 호환 멀티모달 포맷(content 배열 + data URL)을 사용한다.
     * Gemini 2.x / GPT-4o 계열 모두 동일 스키마를 지원한다.
     *
     * @param imageBytes  원본 이미지 바이트
     * @param contentType image/jpeg, image/png 등. 없으면 image/jpeg 로 간주.
     */
    public String chatWithImage(String systemPrompt, String userPrompt, byte[] imageBytes, String contentType) {
        if (imageBytes == null || imageBytes.length == 0) {
            throw new ApiException(ErrorCode.LLM_FAILED, "분석할 이미지가 비어있습니다.");
        }
        return chatWithImages(systemPrompt, userPrompt, List.of(new ImagePart(imageBytes, contentType)));
    }

    /**
     * 여러 장의 이미지를 한 번의 호출로 함께 분석한다.
     *
     * <p>같은 하자를 여러 각도에서 찍은 사진들을 한 컨텍스트로 넘겨야
     * 모델이 종합해서 판단할 수 있다. 장수만큼 이미지 토큰이 늘어난다.
     */
    public String chatWithImages(String systemPrompt, String userPrompt, List<ImagePart> images) {
        if (images == null || images.isEmpty()) {
            throw new ApiException(ErrorCode.LLM_FAILED, "분석할 이미지가 비어있습니다.");
        }
        return call(systemPrompt, userPrompt, images);
    }

    /** 비전 호출에 넘길 이미지 1장. */
    public record ImagePart(byte[] bytes, String contentType) {}

    private String call(String systemPrompt, String userPrompt, List<ImagePart> images) {
        if (apiKey.isBlank()) {
            log.error("[LLM] api-key 가 비어있습니다. LLM_API_KEY 환경변수를 주입하세요.");
            throw new ApiException(ErrorCode.LLM_FAILED, "LLM API 키가 설정되지 않았습니다.");
        }

        String url = baseUrl + "/chat/completions";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Object userContent;
        if (images == null || images.isEmpty()) {
            userContent = userPrompt;
        } else {
            List<Map<String, Object>> parts = new java.util.ArrayList<>();
            parts.add(Map.of("type", "text", "text", userPrompt));

            for (ImagePart image : images) {
                if (image == null || image.bytes() == null || image.bytes().length == 0) continue;

                String mime = (image.contentType() == null || image.contentType().isBlank())
                        ? "image/jpeg" : image.contentType();
                String dataUrl = "data:" + mime + ";base64,"
                        + java.util.Base64.getEncoder().encodeToString(image.bytes());

                parts.add(Map.of("type", "image_url", "image_url", Map.of("url", dataUrl)));
            }

            userContent = parts;
        }

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user",   "content", userContent)
                ),
                // ⭐ JSON 강제 출력 (OpenAI gpt-4o/4o-mini, Gemini 2.x 모두 지원)
                "response_format", Map.of("type", "json_object"),
                "temperature", temperature,
                "max_tokens", maxTokens
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> res = restTemplate.exchange(
                    url, HttpMethod.POST, request, Map.class
            );
            Map<?, ?> respBody = res.getBody();
            if (respBody == null) {
                throw new ApiException(ErrorCode.LLM_FAILED, "LLM 응답이 비어있습니다.");
            }

            // OpenAI 호환 스키마: { choices:[{ message:{ content:"..." } }], usage:{...} }
            Object choicesObj = respBody.get("choices");
            if (!(choicesObj instanceof List<?> choices) || choices.isEmpty()) {
                throw new ApiException(ErrorCode.LLM_FAILED, "LLM 응답에 choices 가 없습니다.");
            }
            Object first = choices.get(0);
            if (!(first instanceof Map<?, ?> firstMap)) {
                throw new ApiException(ErrorCode.LLM_FAILED, "LLM choices 형식 오류");
            }
            Object messageObj = firstMap.get("message");
            if (!(messageObj instanceof Map<?, ?> messageMap)) {
                throw new ApiException(ErrorCode.LLM_FAILED, "LLM message 형식 오류");
            }
            Object contentObj = messageMap.get("content");
            if (!(contentObj instanceof String content)) {
                throw new ApiException(ErrorCode.LLM_FAILED, "LLM content 가 문자열이 아닙니다.");
            }

            // 토큰 사용량 로그 (비용 모니터링용)
            Object usage = respBody.get("usage");
            log.info("[LLM] model={} usage={} content.len={}", model, usage, content.length());

            return content;
        } catch (HttpStatusCodeException e) {
            log.warn("[LLM] HTTP {} body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new ApiException(ErrorCode.LLM_FAILED, "LLM 호출 실패: " + e.getStatusCode());
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("[LLM] failed", e);
            throw new ApiException(ErrorCode.LLM_FAILED);
        }
    }
}
