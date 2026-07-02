package com.example.backend1.company.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Service
public class NaverSearchClient {

    // 네이버 검색 API (지역검색용) - 기존 그대로
    @Value("${naver.api.client-id}") private String clientId;
    @Value("${naver.api.client-secret}") private String clientSecret;
    @Value("${naver.api.search-url}") private String searchUrl;

    // ⭐ NCP Maps API (Geocoding용) - 추가
    @Value("${naver.api.ncp-client-id}") private String ncpClientId;
    @Value("${naver.api.ncp-client-secret}") private String ncpClientSecret;
    @Value("${naver.api.geocode-url}") private String geocodeUrl;

    /** 1. 업체 검색 API (네이버 검색) */
    public Map<String, Object> searchLocal(String query) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Naver-Client-Id", clientId);
        headers.set("X-Naver-Client-Secret", clientSecret);

        HttpEntity<String> entity = new HttpEntity<>(headers);
        // ⭐ 자동 "수리 업체" suffix 제거:
        //    기존: "누수 경기" → "누수 경기 수리 업체" (토큰 4개 → 네이버에서 매칭 0건)
        //    이제: 호출부에서 완성된 키워드(예: "성남 누수수리")를 그대로 전달한다.
        //    지역검색은 2~3 토큰일 때 결과가 가장 잘 나오고,
        //    증상은 공백없는 복합명사(누수수리, 곰팡이제거) 형태가 매칭률이 높다.
        String keyword = (query == null || query.isBlank()) ? "집수리 업체" : query.trim();

        // ⭐ 네이버 Open API 지역검색 제약
        //   - display 최댓값: 5 (기본값 1). 10 을 보내면 400 Bad Request.
        //   - start 최댓값: 1. (웹/블로그 검색과 달리 페이지네이션 없음)
        //   - 데이터 자체도 네이버 지도 앱 Place DB 보다 훨씬 얇은 POI 서브셋.
        // ⭐ Kakao 쪽과 동일한 이중 인코딩 버그 방지: String 대신 URI 로 넘긴다.
        URI finalUri = UriComponentsBuilder.fromHttpUrl(searchUrl)
                .queryParam("query", keyword)
                .queryParam("display", 5)
                .queryParam("start", 1)
                .queryParam("sort", "random")
                .encode(StandardCharsets.UTF_8)
                .build()
                .toUri();

        try {
            ResponseEntity<Map> response = restTemplate.exchange(finalUri, HttpMethod.GET, entity, Map.class);
            Map<String, Object> body = response.getBody();
            System.out.println("[NaverSearchClient] query='" + keyword + "' total="
                    + (body == null ? "null" : body.get("total")));
            return body;
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            // 네이버가 어떤 사유로 400/401/429 등을 냈는지 원문 바디까지 로그로 남긴다.
            System.err.println("[NaverSearchClient] HTTP " + e.getStatusCode()
                    + " body=" + e.getResponseBodyAsString()
                    + " uri=" + finalUri);
            throw e;
        }
    }

    /** 2. 주소를 위경도 좌표로 변환하는 API (NCP Geocoding) */
    public Map<String, Object> getGeocode(String address) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        // ⭐ NCP용 헤더 - 검색 API랑 다름!
        headers.set("X-NCP-APIGW-API-KEY-ID", ncpClientId);
        headers.set("X-NCP-APIGW-API-KEY", ncpClientSecret);

        // ⭐ Geocoding 도 마찬가지로 URI 객체로 넘겨서 이중 인코딩 방지.
        URI uri = UriComponentsBuilder.fromHttpUrl(geocodeUrl)
                .queryParam("query", address)
                .encode(StandardCharsets.UTF_8)
                .build()
                .toUri();

        HttpEntity<String> entity = new HttpEntity<>(headers);
        ResponseEntity<Map> response = restTemplate.exchange(uri, HttpMethod.GET, entity, Map.class);
        return response.getBody();
    }
}