package com.example.backend1.expert.dto;

import java.util.List;

/**
 * 프론트엔드 `ExpertVendor` 스키마와 맞춘 응답 DTO.
 * - id, name, phone, addressLine, serviceRegionLabel: 실제 DB 필드
 * - minPrice, maxPrice: minEstimatedQuoteKrw / maxEstimatedQuoteKrw 매핑
 * - intro: capabilityNote 대체
 * - coverageAreas: serviceRegionLabel 파싱
 * - avgRating: 리뷰 없으면 null, 있으면 소수점 1자리 평균 (프론트 normalizeVendor 가 raw.avgRating 으로 읽음)
 * - reviewCount: 실제 리뷰 수
 */
public class ExpertDtos {

    public record ExpertVendor(
            Long id,
            String name,
            Double avgRating,    // null = 리뷰 없음. 프론트가 raw.avgRating 으로 읽는다.
            int reviewCount,
            int minPrice,
            Integer maxPrice,
            String phone,
            String intro,
            List<String> coverageAreas,
            String addressLine,
            String serviceRegionLabel,
            Double distanceKm,
            Double latitude,
            Double longitude    ) {}
}
