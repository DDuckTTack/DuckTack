package com.example.backend1.coupon.dto;

import com.example.backend1.coupon.domain.CouponStatus;

import java.time.OffsetDateTime;

public class CouponDtos {

    public record CouponItem(
            Long couponId,
            Long companyId,
            String companyName,
            int discountPercent,
            CouponStatus status,
            OffsetDateTime issuedAt,
            OffsetDateTime usedAt
    ) {}
}
