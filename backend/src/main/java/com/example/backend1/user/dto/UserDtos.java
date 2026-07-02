package com.example.backend1.user.dto;

import com.example.backend1.user.domain.RentType;
import com.example.backend1.user.domain.ResidenceType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public class UserDtos {

    // 내 정보 응답: 팀원 코드의 email 필드 유지
    public record MeResponse(
            Long id,
            String username,
            String email,
            String phoneNumber,
            String address,
            ResidenceType residenceType,
            RentType rentType
    ) {}

    // 프로필 수정 요청: 팀원 코드의 username, email 필드 유지
    public record UpdateProfileRequest(
            String username,
            String email,

            @NotNull
            ResidenceType residenceType,

            @NotNull
            RentType rentType,

            @Pattern(
                    regexp = "^[0-9\\-+() ]{8,20}$",
                    message = "전화번호 형식이 올바르지 않습니다."
            )
            String phoneNumber,

            String address
    ) {}
}