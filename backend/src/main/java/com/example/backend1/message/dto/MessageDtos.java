package com.example.backend1.message.dto;

import com.example.backend1.message.domain.MessageReportStatus;
import com.example.backend1.message.domain.ReportReason;

import java.time.OffsetDateTime;

public class MessageDtos {

    public record CreateConversationRequest(
            Long targetUserId,
            Long targetCompanyId
    ) {}

    public record ConversationItem(
            Long conversationId,
            Long otherUserId,
            String otherUsername,
            boolean otherIsCompany,
            String otherDisplayName,
            String lastMessagePreview,
            OffsetDateTime lastMessageAt,
            long unreadCount
    ) {}

    public record SendMessageRequest(
            String content
    ) {}

    public record MessageItem(
            Long id,
            Long conversationId,
            Long senderId,
            String senderUsername,
            boolean mine,
            String content,
            OffsetDateTime createdAt
    ) {}

    public record ReportRequest(
            Long conversationId,
            Long messageId,
            ReportReason reason,
            String detail
    ) {}

    public record AdminMessageReportItem(
            Long id,
            Long conversationId,
            Long reporterId,
            String reporterUsername,
            Long reportedUserId,
            String reportedUsername,
            Long reportedMessageId,
            String reportedMessageContent,
            ReportReason reason,
            String detail,
            MessageReportStatus status,
            String adminMemo,
            OffsetDateTime createdAt,
            OffsetDateTime resolvedAt
    ) {}

    public record ResolveReportRequest(
            String action,
            String adminMemo
    ) {}
}
