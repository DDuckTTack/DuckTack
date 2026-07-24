package com.example.backend1.admin.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.community.dto.CommunityPostDtos;
import com.example.backend1.community.service.CommunityPostService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/community-reports")
@SecurityRequirement(name = "bearerAuth")
public class AdminCommunityReportController {

    private final CommunityPostService communityPostService;

    public AdminCommunityReportController(CommunityPostService communityPostService) {
        this.communityPostService = communityPostService;
    }

    @GetMapping
    public ApiResponse<Page<CommunityPostDtos.AdminReportItem>> list(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ApiResponse.ok(communityPostService.listReports(pageable));
    }
}
