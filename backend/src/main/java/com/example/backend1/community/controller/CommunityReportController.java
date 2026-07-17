package com.example.backend1.community.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.community.dto.CommunityPostDtos;
import com.example.backend1.community.service.CommunityPostService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/community/reports")
public class CommunityReportController {

    private final CommunityPostService communityPostService;

    public CommunityReportController(CommunityPostService communityPostService) {
        this.communityPostService = communityPostService;
    }

    @PostMapping
    public ApiResponse<CommunityPostDtos.ReportResponse> report(
            @RequestBody CommunityPostDtos.ReportRequest request,
            Authentication authentication
    ) {
        return ApiResponse.ok(communityPostService.report(request, authentication));
    }
}
