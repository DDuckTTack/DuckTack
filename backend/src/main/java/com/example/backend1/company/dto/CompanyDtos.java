package com.example.backend1.company.dto;

import com.example.backend1.diagnosis.domain.IssueType;

import java.util.Set;

public class CompanyDtos {

    /** 일반 사용자용 업체 목록 항목 */
    public record CompanyListItem(
            Long id,
            String name,
            String phone,
            String addressLine,
            String serviceRegionLabel,
            Set<IssueType> specialties,
            Integer minEstimatedQuoteKrw,
            Integer maxEstimatedQuoteKrw
    ) {}

    /** 일반 사용자용 업체 상세 */
    public record CompanyDetail(
            Long id,
            String name,
            String phone,
            String email,
            String addressLine,
            String postalCode,
            String serviceRegionLabel,
            Double latitude,
            Double longitude,
            Set<IssueType> specialties,
            Integer minEstimatedQuoteKrw,
            Integer maxEstimatedQuoteKrw,
            String capabilityNote
    ) {}

    // 기존 CompanyDtos 클래스 내부에 추가
    // ⭐ 좌표/거리 필드를 boxed Double 로 변경: 관리자가 좌표 없이 등록한 제휴 업체도
    //    "거리 정보 없음" 상태로 노출할 수 있도록 null 허용.
    /**
     * partner 필드 : 프론트 normalizer 가 item.partner 로 읽는다.
     *   - true  = 백엔드에 등록된 제휴 업체
     *   - false = 카카오 로컬 API 검색 결과 (비제휴)
     * avgRating null = 리뷰 없음, 숫자이면 소수점 1자리 평균 별점
     */
    public record NearbyCompanyResponse(
            Long id,
            String name,
            String phone,
            String address,
            String serviceRegionLabel,
            Double latitude,
            Double longitude,
            Double distanceKm,
            boolean partner,
            String kakaoPlaceId,
            String placeUrl,
            Double avgRating,
            long reviewCount
    ) {}
}
