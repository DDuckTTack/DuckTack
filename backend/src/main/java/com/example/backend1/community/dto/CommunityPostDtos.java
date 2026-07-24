package com.example.backend1.community.dto;

import com.example.backend1.community.domain.BoardType;
import com.example.backend1.community.domain.CommunityStatus;
import com.example.backend1.community.domain.ReportReason;
import com.example.backend1.community.domain.ReportTargetType;

import java.time.OffsetDateTime;

public class CommunityPostDtos {

    public record PostCreateRequest(
            BoardType boardType,
            String title,
            String content,
            String regionCode,
            String regionName,
            String productName
    ) {}

    public record PostUpdateRequest(
            BoardType boardType,
            String title,
            String content,
            String regionCode,
            String regionName,
            String productName
    ) {}

    public record PostListResponse(
            Long id,
            Long postId,
            BoardType boardType,
            String title,
            String contentPreview,
            Long authorId,
            String authorName,
            String regionName,
            String productName,
            int viewCount,
            int likeCount,
            int commentCount,
            boolean likedByMe,
            OffsetDateTime createdAt
    ) {}

    public record PostDetailResponse(
            Long id,
            Long postId,
            BoardType boardType,
            String title,
            String content,
            String contentPreview,
            Long authorId,
            String authorName,
            String regionCode,
            String regionName,
            String productName,
            int viewCount,
            int likeCount,
            int commentCount,
            boolean likedByMe,
            long reportCount,
            CommunityStatus status,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            boolean editable,
            boolean deletable
    ) {}

    public record CommentRequest(
            String content
    ) {}

    public record CommentResponse(
            Long commentId,
            Long postId,
            String content,
            Long authorId,
            String authorName,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            boolean mine,
            long reportCount
    ) {}

    public record LikeResponse(
            Long postId,
            int likeCount,
            boolean likedByMe
    ) {}

    public record ReportRequest(
            ReportTargetType targetType,
            Long targetId,
            Long postId,
            Long commentId,
            ReportReason reason,
            String detail
    ) {}

    public record ReportResponse(
            Long reportId,
            ReportTargetType targetType,
            Long targetId,
            ReportReason reason,
            OffsetDateTime createdAt
    ) {}

    public record AdminReportItem(
            Long reportId,
            ReportTargetType targetType,
            Long targetId,
            Long postId,
            Long targetAuthorId,
            String targetAuthorName,
            String targetAuthorEmail,
            String targetAuthorPhone,
            String targetAuthorAddress,
            String targetAuthorRole,
            String targetContent,
            Long reporterId,
            String reporterName,
            String reporterEmail,
            String reporterPhone,
            String reporterAddress,
            String reporterRole,
            ReportReason reason,
            String detail,
            OffsetDateTime createdAt
    ) {}
}
