package com.example.backend1.ai.yolo;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;

/**
 * GCP 에 배포된 YOLO 객체 탐지 서버 클라이언트.
 *
 * <p>계약 (AI 팀 합의):
 * <ul>
 *   <li>엔드포인트: {@code POST {yolo.base-url}/predict}</li>
 *   <li>입력: multipart/form-data (이미지 파일 직접 업로드)</li>
 *   <li>응답: {@link YoloResponse}</li>
 * </ul>
 *
 * <p>인증이 필요할 경우 {@code yolo.api-key} 환경변수 주입 시 Authorization: Bearer 자동 추가.
 */
@Component
public class YoloClient {

    private static final Logger log = LoggerFactory.getLogger(YoloClient.class);

    private final RestTemplate restTemplate;
    private final String baseUrl;
    private final String detectPath;
    private final String apiKey;
    private final String multipartFieldName;

    public YoloClient(
            @Qualifier("yoloRestTemplate") RestTemplate restTemplate,
            @Value("${yolo.base-url}") String baseUrl,
            // ⭐ 엔드포인트 경로 (AI 팀 실제 = /detect)
            @Value("${yolo.detect-path:/detect}") String detectPath,
            @Value("${yolo.api-key:}") String apiKey,
            // ⭐ AI 팀과 합의된 multipart field name (실제 = image)
            @Value("${yolo.multipart-field:image}") String multipartFieldName
    ) {
        this.restTemplate = restTemplate;
        this.baseUrl = (baseUrl == null) ? "" : baseUrl.replaceAll("/+$", "");
        this.detectPath = (detectPath == null || detectPath.isBlank()) ? "/detect"
                : (detectPath.startsWith("/") ? detectPath : "/" + detectPath);
        this.apiKey = apiKey == null ? "" : apiKey;
        this.multipartFieldName = multipartFieldName;
    }

    /**
     * 사용자가 업로드한 이미지를 그대로 YOLO 서버로 forward 한다.
     *
     * @param file 사용자 multipart 업로드 파일
     * @return YOLO detection 결과
     * @throws ApiException AI_UNAVAILABLE 시 (HTTP 오류 또는 네트워크 실패)
     */
    public YoloResponse detect(MultipartFile file) {
        URI uri = URI.create(baseUrl + detectPath);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        // GCP 가 인증 요구하면 Authorization: Bearer xxx 추가
        if (!apiKey.isBlank()) {
            headers.setBearerAuth(apiKey);
        }

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        try {
            // 파일 바이트를 ByteArrayResource 로 감싸 multipart part 로 전송.
            // RestTemplate 는 FileSystemResource/ByteArrayResource 만 multipart 로 인식.
            String filename = file.getOriginalFilename() != null
                    ? file.getOriginalFilename()
                    : "upload.jpg";
            ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return filename;
                }
            };
            body.add(multipartFieldName, fileResource);
        } catch (IOException e) {
            log.error("[YoloClient] failed to read upload bytes", e);
            throw new ApiException(ErrorCode.YOLO_FAILED, "이미지 파일을 읽을 수 없습니다.");
        }

        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<YoloResponse> res = restTemplate.exchange(
                    uri, HttpMethod.POST, request, YoloResponse.class
            );
            YoloResponse parsed = res.getBody();
            int count = (parsed == null || parsed.detections() == null)
                    ? 0
                    : parsed.detections().size();
            log.info("[YoloClient] uri={} status={} detections={}", uri, res.getStatusCode(), count);
            return parsed;
        } catch (HttpStatusCodeException e) {
            log.warn("[YoloClient] HTTP {} body={} uri={}",
                    e.getStatusCode(), e.getResponseBodyAsString(), uri);
            throw new ApiException(ErrorCode.YOLO_FAILED, "AI 분석 서버 오류: " + e.getStatusCode());
        } catch (Exception e) {
            log.error("[YoloClient] failed uri={}", uri, e);
            throw new ApiException(ErrorCode.YOLO_FAILED);
        }
    }
}
