package com.example.backend1.company.domain;

public enum CompanySource {
    ADMIN,  // 관리자가 직접 등록한 제휴 업체
    KAKAO   // 리뷰 작성 시 카카오 API 결과에서 lazy 생성된 업체
}
