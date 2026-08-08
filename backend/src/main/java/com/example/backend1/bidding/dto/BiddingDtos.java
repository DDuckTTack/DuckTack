package com.example.backend1.bidding.dto;

import java.time.OffsetDateTime;
import java.util.List;

public final class BiddingDtos {
    private BiddingDtos() {}

    public record CreateRequest(Long historyId, String address, Double latitude, Double longitude,
                                String requestNote, OffsetDateTime deadline) {}
    public record SubmitBidRequest(Integer price, String message) {}
    public record RadiusRequest(Integer radiusKm) {}
    public record SelectResponse(Long bidRequestId, Long companyId, String companyName,
                                 Integer price, Long historyId) {}
    public record Offer(Long id, Long companyId, String companyName, String companyPhone,
                        String companyAddress, Double distanceKm, Double avgRating, Integer reviewCount,
                        Integer price, String message,
                        OffsetDateTime createdAt, boolean selected) {}
    public record Item(Long id, Long historyId, String imageUrl, String issueType, Integer riskScore,
                       String userName, String address, Double distanceKm, String requestNote,
                       OffsetDateTime deadline, String status, OffsetDateTime createdAt,
                       List<Offer> offers, Long myBidId, Integer myBidPrice, String myBidMessage) {}
    public record Radius(Integer radiusKm) {}
    public record CompanyResult(Long bidId, Long bidRequestId, Integer price, String issueType,
                                OffsetDateTime deadline, String result, OffsetDateTime updatedAt) {}
    public record AdminItem(Long id, Long historyId, Long userId, String username,
                            String imageUrl, String issueType, Integer riskScore,
                            String address, String requestNote, OffsetDateTime deadline,
                            String status, OffsetDateTime createdAt, OffsetDateTime selectedAt,
                            Long selectedCompanyId, String selectedCompanyName,
                            List<Offer> offers) {}
}
