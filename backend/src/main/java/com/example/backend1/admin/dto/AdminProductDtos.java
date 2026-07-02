package com.example.backend1.admin.dto;

import com.example.backend1.diagnosis.domain.IssueType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;

public class AdminProductDtos {

    public record CreateRequest(
            @NotBlank String name,
            String productId,
            @NotBlank String coupangUrl,
            String imageUrl,
            @NotNull IssueType category,
            Boolean active
    ) {}

    public record UpdateRequest(
            String name,
            String productId,
            String coupangUrl,
            String imageUrl,
            @NotNull IssueType category,
            Boolean active
    ) {}

    public record ActiveRequest(
            @NotNull Boolean active
    ) {}

    public record Response(
            Long id,
            String name,
            String productId,
            String coupangUrl,
            String imageUrl,
            IssueType category,
            boolean active,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {}

    public record ListItem(
            Long id,
            String name,
            String productId,
            String coupangUrl,
            String imageUrl,
            IssueType category,
            boolean active,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {}
}