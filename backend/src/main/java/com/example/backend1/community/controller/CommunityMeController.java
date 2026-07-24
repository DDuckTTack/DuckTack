package com.example.backend1.community.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.community.dto.CommunityPostDtos;
import com.example.backend1.community.service.CommunityPostService;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/community/me")
public class CommunityMeController {

    private final CommunityPostService communityPostService;

    public CommunityMeController(CommunityPostService communityPostService) {
        this.communityPostService = communityPostService;
    }

    @GetMapping("/posts")
    public ApiResponse<Page<CommunityPostDtos.PostListResponse>> posts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication
    ) {
        return ApiResponse.ok(communityPostService.myPosts(page, size, authentication));
    }

    @GetMapping("/commented-posts")
    public ApiResponse<Page<CommunityPostDtos.PostListResponse>> commentedPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication
    ) {
        return ApiResponse.ok(communityPostService.myCommentedPosts(page, size, authentication));
    }
}
