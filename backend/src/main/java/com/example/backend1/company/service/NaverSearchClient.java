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

/**
 * 네이버 NCP Geocoding 클라이언트 (주소 → 위경도).
 *
 * 네이버 지역검색(searchLocal)은 카카오 로컬 API 로 대체되어 제거했다.
 * 업체 키워드 검색은 {@link KakaoLocalClient} 를 사용한다.
 */
@Service
public class NaverSearchClient {

    @Value("${naver.api.ncp-client-id}") private String ncpClientId;
    @Value("${naver.api.ncp-client-secret}") private String ncpClientSecret;
    @Value("${naver.api.geocode-url}") private String geocodeUrl;

    /** 주소를 위경도 좌표로 변환 (NCP Geocoding). */
    public Map<String, Object> getGeocode(String address) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        // NCP 는 일반 네이버 오픈API 와 헤더 이름이 다르다.
        headers.set("X-NCP-APIGW-API-KEY-ID", ncpClientId);
        headers.set("X-NCP-APIGW-API-KEY", ncpClientSecret);

        // String 대신 URI 로 넘겨서 이중 인코딩 방지.
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