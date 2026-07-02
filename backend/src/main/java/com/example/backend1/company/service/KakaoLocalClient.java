package com.example.backend1.company.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * 카카오 로컬 REST API 클라이언트 (키워드로 장소 검색).
 *
 * 엔드포인트: GET https://dapi.kakao.com/v2/local/search/keyword.json
 * 문서     : https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword
 *
 * 네이버 Open API 지역검색 대비 장점:
 *   - 한 페이지 size 최대 15 (네이버는 5), page 최대 45 → 최대 675건
 *   - 중심좌표(x,y) + radius(미터) 로 반경 검색 가능
 *   - 응답에 distance(미터, 문자열) 필드가 이미 들어있음 (서버 Haversine 생략 가능)
 *   - POI DB 가 카카오 지도 웹과 사실상 동일
 *   - 무료 할당량 일 30,000건
 */
@Service
public class KakaoLocalClient {
    private static final Logger log = LoggerFactory.getLogger(KakaoLocalClient.class);

    @Value("${kakao.api.rest-key}") private String restKey;
    @Value("${kakao.api.local-url:https://dapi.kakao.com/v2/local/search/keyword.json}")
    private String localUrl;

    /**
     * 키워드로 장소 검색.
     *
     * @param query     검색어 (예: "누수수리", "경기 곰팡이제거")
     * @param centerLat 중심 위도(=y). 널이면 전국 검색으로 fallback.
     * @param centerLng 중심 경도(=x). 널이면 전국 검색으로 fallback.
     * @param radiusMeters 반경(미터). 0~20000. centerLat/Lng 가 있을 때만 적용.
     * @return 카카오 응답 body (documents 배열 포함). 실패 시 예외.
     */
    public Map<String, Object> searchKeyword(String query,
                                             Double centerLat,
                                             Double centerLng,
                                             int radiusMeters) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "KakaoAK " + restKey);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        String keyword = (query == null || query.isBlank()) ? "집수리" : query.trim();

        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(localUrl)
                .queryParam("query", keyword)
                .queryParam("size", 15)
                .queryParam("page", 1)
                .queryParam("sort", "distance"); // 좌표가 있으면 거리순, 없으면 카카오가 accuracy 로 자동

        if (centerLat != null && centerLng != null) {
            int clamped = Math.min(Math.max(radiusMeters, 1), 20000);
            builder.queryParam("x", centerLng) // 경도 (longitude)
                   .queryParam("y", centerLat) // 위도 (latitude)
                   .queryParam("radius", clamped);
        }

        // ⭐⭐ 핵심: RestTemplate.exchange(String, ...) 에 넘기면 Spring 이 URI template 로 보고
        //    이미 퍼센트 인코딩된 문자열을 한 번 더 인코딩해버립니다 (% → %25).
        //    Kakao 가 "same_name.keyword" 로 응답에 "%ED%8E%B8%EC%9D%98%EC%A0%90" 를 그대로 에코해 주는
        //    증상이 정확히 이 이중 인코딩 때문이었습니다.
        //    → URI 객체로 넘기면 Spring 이 재인코딩하지 않습니다 (이미 인코딩된 상태로 간주).
        URI finalUri = builder.encode(StandardCharsets.UTF_8).build().toUri();
        String maskedKey = maskKey(restKey);
        log.info("[KakaoLocalClient] request query='{}' center=({}, {}) radius={} key={} uri={}",
                keyword, centerLat, centerLng, radiusMeters, maskedKey, finalUri);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(finalUri, HttpMethod.GET, entity, Map.class);
            Map<String, Object> body = response.getBody();
            Object meta = (body == null) ? null : body.get("meta");
            Object total = (meta instanceof Map<?, ?> mm) ? mm.get("total_count") : null;
            Object pageable = (meta instanceof Map<?, ?> mm) ? mm.get("pageable_count") : null;
            Object isEnd = (meta instanceof Map<?, ?> mm) ? mm.get("is_end") : null;
            log.info("[KakaoLocalClient] response query='{}' total={} pageable={} isEnd={}",
                    keyword, total, pageable, isEnd);
            return body;
        } catch (HttpStatusCodeException e) {
            // 키 오류(401), 권한(403), 요청한도(429) 등을 원문 바디까지 그대로 남긴다.
            log.warn("[KakaoLocalClient] HTTP {} body={} key={} uri={}",
                    e.getStatusCode(), e.getResponseBodyAsString(), maskedKey, finalUri);
            throw e;
        }
    }

    private String maskKey(String key) {
        if (key == null || key.isBlank()) return "EMPTY";
        int show = Math.min(4, key.length());
        return key.substring(0, show) + "****(" + key.length() + ")";
    }
}
