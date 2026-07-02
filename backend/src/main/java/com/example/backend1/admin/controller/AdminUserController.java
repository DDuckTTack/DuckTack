package com.example.backend1.admin.controller;

import com.example.backend1.admin.dto.AdminUserDtos;
import com.example.backend1.admin.service.AdminUserService;
import com.example.backend1.common.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@SecurityRequirement(name = "bearerAuth")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public ApiResponse<Page<AdminUserDtos.UserListItem>> list(
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ApiResponse.ok(adminUserService.listUsers(pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<AdminUserDtos.UserDetailResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(adminUserService.getUser(id));
    }

    /** 특정 사용자의 진단 이력 전체 조회 */
    @GetMapping("/{id}/histories")
    public ApiResponse<List<AdminUserDtos.UserHistoryItem>> getUserHistories(@PathVariable Long id) {
        return ApiResponse.ok(adminUserService.getUserHistories(id));
    }
}
