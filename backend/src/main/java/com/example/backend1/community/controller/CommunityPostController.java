package com.example.backend1.community.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.community.domain.BoardType;
import com.example.backend1.community.dto.CommunityPostDtos;
import com.example.backend1.community.service.CommunityPostService;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/community/posts")
public class CommunityPostController {

    private final CommunityPostService communityPostService;

    public CommunityPostController(CommunityPostService communityPostService) {
        this.communityPostService = communityPostService;
    }

    @GetMapping
    public ApiResponse<Page<CommunityPostDtos.PostListResponse>> list(
            @RequestParam(required = false) BoardType boardType,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String regionCode,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "latest") String sort,
            Authentication authentication
    ) {
        return ApiResponse.ok(communityPostService.list(boardType, keyword, regionCode, page, size, sort, authentication));
    }

    @GetMapping("/{postId}")
    public ApiResponse<CommunityPostDtos.PostDetailResponse> detail(
            @PathVariable Long postId,
            Authentication authentication
    ) {
        return ApiResponse.ok(communityPostService.detail(postId, authentication));
    }

    @GetMapping("/{postId}/comments")
    public ApiResponse<List<CommunityPostDtos.CommentResponse>> comments(
            @PathVariable Long postId,
            Authentication authentication
    ) {
        return ApiResponse.ok(communityPostService.comments(postId, authentication));
    }

    @PostMapping("/{postId}/comments")
    public ApiResponse<CommunityPostDtos.CommentResponse> createComment(
            @PathVariable Long postId,
            @RequestBody CommunityPostDtos.CommentRequest request,
            Authentication authentication
    ) {
        return ApiResponse.ok(communityPostService.createComment(postId, request, authentication));
    }

    @PostMapping("/{postId}/like")
    public ApiResponse<CommunityPostDtos.LikeResponse> like(
            @PathVariable Long postId,
            Authentication authentication
    ) {
        return ApiResponse.ok(communityPostService.like(postId, authentication));
    }

    @DeleteMapping("/{postId}/like")
    public ApiResponse<CommunityPostDtos.LikeResponse> unlike(
            @PathVariable Long postId,
            Authentication authentication
    ) {
        return ApiResponse.ok(communityPostService.unlike(postId, authentication));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<CommunityPostDtos.PostDetailResponse> createJson(
            @RequestBody CommunityPostDtos.PostCreateRequest request,
            Authentication authentication
    ) {
        return ApiResponse.ok(communityPostService.create(request, authentication));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<CommunityPostDtos.PostDetailResponse> createMultipart(
            @RequestPart("request") String request,
            Authentication authentication
    ) {
        return ApiResponse.ok(communityPostService.createFromMultipartRequest(request, authentication));
    }

    @PutMapping(value = "/{postId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<CommunityPostDtos.PostDetailResponse> updateJson(
            @PathVariable Long postId,
            @RequestBody CommunityPostDtos.PostUpdateRequest request,
            Authentication authentication
    ) {
        return ApiResponse.ok(communityPostService.update(postId, request, authentication));
    }

    @PutMapping(value = "/{postId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<CommunityPostDtos.PostDetailResponse> updateMultipart(
            @PathVariable Long postId,
            @RequestPart("request") String request,
            Authentication authentication
    ) {
        return ApiResponse.ok(communityPostService.updateFromMultipartRequest(postId, request, authentication));
    }

    @DeleteMapping("/{postId}")
    public ApiResponse<Void> delete(
            @PathVariable Long postId,
            Authentication authentication
    ) {
        communityPostService.delete(postId, authentication);
        return ApiResponse.ok(null);
    }

}
