package com.example.backend1.review.dto;

import java.time.OffsetDateTime;
import java.util.List;

public class ReviewDtos {

    public record CreateRequest(
            Long historyId,

            Long companyId,
            String kakaoPlaceId,
            String kakaoPlaceName,
            String kakaoPlacePhone,
            String kakaoPlaceAddress,
            Double kakaoPlaceLat,
            Double kakaoPlaceLng,

            int rating,
            String content
    ) {}

    public record UpdateRequest(
            int rating,
            String content
    ) {}

    public record ReviewItem(
            Long id,
            Long historyId,
            Long companyId,
            String companyName,
            String authorUsername,
            int rating,
            String content,
            OffsetDateTime createdAt
    ) {}

    public record ReviewSummary(
            double avgRating,
            int reviewCount,
            List<ReviewItem> reviews
    ) {}

    public record ReviewStats(
            double avgRating,
            int reviewCount
    ) {}
}