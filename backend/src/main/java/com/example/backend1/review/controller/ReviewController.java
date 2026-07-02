package com.example.backend1.review.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.review.dto.ReviewDtos;
import com.example.backend1.review.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.List;

@Tag(name = "Review")
@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    /**
     * 사용자 리뷰 작성
     */
    @Operation(summary = "리뷰 작성")
    @PostMapping
    public ApiResponse<ReviewDtos.ReviewItem> create(
            @RequestBody ReviewDtos.CreateRequest req,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ApiResponse.ok(reviewService.createReview(req, userDetails.getUsername()));
    }

    /**
     * 공개 업체 리뷰 조회
     */
    @Operation(summary = "업체 리뷰 조회")
    @GetMapping
    public ApiResponse<ReviewDtos.ReviewSummary> get(
            @RequestParam(required = false) Long companyId,
            @RequestParam(required = false) String kakaoPlaceId
    ) {
        if (companyId != null) {
            return ApiResponse.ok(reviewService.getByCompanyId(companyId));
        }

        if (kakaoPlaceId != null) {
            return ApiResponse.ok(reviewService.getByKakaoPlaceId(kakaoPlaceId));
        }

        return ApiResponse.ok(new ReviewDtos.ReviewSummary(0.0, 0, java.util.Collections.emptyList()));
    }

    /**
     * 업체 웹 리뷰관리
     */
    @Operation(summary = "내 업체 리뷰 조회")
    @GetMapping("/company/me")
    public ApiResponse<ReviewDtos.ReviewSummary> getMyCompanyReviews(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ApiResponse.ok(reviewService.getMyCompanyReviews(userDetails.getUsername()));
    }

    /**
     * 관리자 리뷰관리
     */
    @Operation(summary = "관리자 리뷰 목록 조회")
    @GetMapping("/admin")
    public ApiResponse<List<ReviewDtos.ReviewItem>> getAdminReviews(
            @RequestParam(required = false) Long companyId
    ) {
        return ApiResponse.ok(reviewService.getAdminReviews(companyId));
    }

    /**
     * 관리자 리뷰 삭제
     */
    @Operation(summary = "관리자 리뷰 삭제")
    @DeleteMapping("/admin/{reviewId}")
    public ApiResponse<String> deleteAdminReview(
            @PathVariable Long reviewId
    ) {
        reviewService.deleteReviewByAdmin(reviewId);
        return ApiResponse.ok("deleted");
    }

    @Operation(summary = "내 리뷰 수정")
    @PutMapping("/{reviewId}/my")
    public ApiResponse<ReviewDtos.ReviewItem> updateMyReview(
            @PathVariable Long reviewId,
            @RequestBody ReviewDtos.UpdateRequest req,
            Authentication authentication
    ) {
        return ApiResponse.ok(
                reviewService.updateMyReview(reviewId, req, authentication.getName())
        );
    }
    @DeleteMapping("/{reviewId}/my")
    public ApiResponse<Void> deleteMyReview(
            @PathVariable Long reviewId,
            Authentication authentication
    ) {
        reviewService.deleteMyReview(reviewId, authentication.getName());
        return ApiResponse.ok(null);
    }
}