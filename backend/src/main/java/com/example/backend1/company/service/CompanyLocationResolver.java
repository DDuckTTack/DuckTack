package com.example.backend1.company.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * 업체 주소 하나로 좌표와 서비스 지역 라벨(서울/경기/...)을 함께 정한다.
 *
 * 앱의 업체 목록은 serviceRegionLabel 이 "경기" 처럼 정확히 일치해야 업체를 노출하고,
 * 입찰 요청은 업체 좌표가 있어야 거리 계산이 되어 업체웹에 보인다.
 * 가입 폼의 주소·서비스 지역은 자유 입력이라 "수원", "...3층" 같은 값이 들어오면 둘 다 깨지므로
 * 여기서 주소를 기준으로 보정한다.
 */
@Component
@RequiredArgsConstructor
public class CompanyLocationResolver {

    private static final Logger log = LoggerFactory.getLogger(CompanyLocationResolver.class);

    /** 앱 지역 탭과 같은 순서/표기. */
    private static final List<String> REGIONS = List.of("서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산");

    private final KakaoLocalClient kakao;

    public record Resolved(Double lat, Double lng, String regionLabel) {}

    /** 주소로 좌표·지역을 찾는다. 아무것도 못 찾으면 모든 값이 null 인 결과를 돌려준다. */
    public Resolved resolve(String address) {
        if (address == null || address.isBlank()) return new Resolved(null, null, null);
        String query = address.trim();

        try {
            // 1) 주소 검색. 상세주소("3층", "101호")가 붙어 있으면 실패하므로 뒤 단어를 하나씩 떼며 재시도한다.
            String current = query;
            for (int i = 0; i < 4 && !current.isBlank(); i++) {
                Resolved r = fromDocuments(kakao.searchAddress(current));
                if (r != null) return r;
                int cut = current.lastIndexOf(' ');
                if (cut <= 0) break;
                current = current.substring(0, cut).trim();
            }

            // 2) 건물명·상호로 적은 경우를 위해 키워드 검색으로 한 번 더 찾는다.
            Resolved r = fromDocuments(kakao.searchKeyword(query, null, null, 0));
            if (r != null) return r;
        } catch (Exception e) {
            log.warn("[CompanyLocationResolver] 주소 변환 실패 address={} cause={}", address, e.toString());
        }

        // 좌표를 못 찾아도 주소 문자열에서 지역은 뽑아본다.
        return new Resolved(null, null, regionLabelOf(query));
    }

    /** "경기도 수원시", "서울특별시" 등에서 앱 지역 라벨을 뽑는다. 8개 지역이 아니면 null. */
    public static String regionLabelOf(String text) {
        if (text == null) return null;
        String t = text.trim();
        for (String region : REGIONS) {
            if (t.startsWith(region)) return region;
        }
        return null;
    }

    public static boolean isKnownRegion(String label) {
        return label != null && REGIONS.contains(label);
    }

    private Resolved fromDocuments(Map<String, Object> response) {
        Object raw = response == null ? null : response.get("documents");
        if (!(raw instanceof List<?> documents) || documents.isEmpty()) return null;
        if (!(documents.get(0) instanceof Map<?, ?> doc)) return null;

        Double lat = toDouble(doc.get("y"));
        Double lng = toDouble(doc.get("x"));
        if (lat == null || lng == null) return null;

        // 주소 검색·키워드 검색 모두 address_name 이 "경기 수원시 ..." 형태로 온다.
        String region = regionLabelOf(String.valueOf(doc.get("address_name")));
        return new Resolved(lat, lng, region);
    }

    private static Double toDouble(Object value) {
        try {
            return value == null ? null : Double.valueOf(String.valueOf(value));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
