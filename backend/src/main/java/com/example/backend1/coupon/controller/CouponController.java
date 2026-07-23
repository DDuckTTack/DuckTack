package com.example.backend1.coupon.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.coupon.dto.CouponDtos;
import com.example.backend1.coupon.service.CouponService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Coupon")
@RestController
@RequestMapping("/api/coupons")
public class CouponController {

    private final CouponService couponService;

    public CouponController(CouponService couponService) {
        this.couponService = couponService;
    }

    @Operation(summary = "내 쿠폰 목록 조회")
    @GetMapping
    public ApiResponse<List<CouponDtos.CouponItem>> listMyCoupons(Authentication authentication) {
        return ApiResponse.ok(couponService.listMyCoupons(authentication.getName()));
    }

    @Operation(summary = "쿠폰 제시(사용 처리)")
    @PostMapping("/{id}/use")
    public ApiResponse<CouponDtos.CouponItem> useCoupon(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return ApiResponse.ok(couponService.useCoupon(authentication.getName(), id));
    }
}
