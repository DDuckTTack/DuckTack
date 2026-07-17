package com.example.backend1.community.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.community.dto.CommunityPostDtos;
import com.example.backend1.community.service.CommunityPostService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/community/comments")
public class CommunityCommentController {

    private final CommunityPostService communityPostService;

    public CommunityCommentController(CommunityPostService communityPostService) {
        this.communityPostService = communityPostService;
    }

    @PutMapping("/{commentId}")
    public ApiResponse<CommunityPostDtos.CommentResponse> updateComment(
            @PathVariable Long commentId,
            @RequestBody CommunityPostDtos.CommentRequest request,
            Authentication authentication
    ) {
        return ApiResponse.ok(communityPostService.updateComment(commentId, request, authentication));
    }

    @DeleteMapping("/{commentId}")
    public ApiResponse<Void> deleteComment(
            @PathVariable Long commentId,
            Authentication authentication
    ) {
        communityPostService.deleteComment(commentId, authentication);
        return ApiResponse.ok(null);
    }
}
