package com.example.backend1.support.dto;

import java.time.OffsetDateTime;

public class SupportDtos {

    public record SendMessageRequest(
            String content
    ) {}

    public record ThreadItem(
            Long threadId,
            String status,
            String lastMessagePreview,
            OffsetDateTime lastMessageAt,
            long unreadCount
    ) {}

    public record MessageItem(
            Long id,
            Long threadId,
            Long senderId,
            String senderUsername,
            String senderRole,
            boolean mine,
            String content,
            OffsetDateTime createdAt
    ) {}

    public record AdminThreadItem(
            Long threadId,
            Long userId,
            String username,
            String phoneNumber,
            String email,
            String address,
            String status,
            String lastMessagePreview,
            OffsetDateTime lastMessageAt,
            OffsetDateTime createdAt
    ) {}
}
