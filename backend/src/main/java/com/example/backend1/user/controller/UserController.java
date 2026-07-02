package com.example.backend1.user.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.user.dto.UserDtos;
import com.example.backend1.user.service.UserService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@SecurityRequirement(name = "bearerAuth") // Swagger 인증 설정 유지
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /** 내 정보 조회 */
    @GetMapping("/me")
    public ApiResponse<UserDtos.MeResponse> me(Authentication authentication) {
        // 인증 객체에서 이름을 추출하여 서비스 호출
        return ApiResponse.ok(userService.me(authentication.getName()));
    }

    /** 내 정보 수정 */
    @PutMapping("/me")
    public ApiResponse<UserDtos.MeResponse> updateMe(
            Authentication authentication,
            @RequestBody UserDtos.UpdateProfileRequest req
    ) {
        // 인증 객체와 수정 요청 데이터를 서비스에 전달
        return ApiResponse.ok(userService.updateProfile(authentication.getName(), req));
    }
}