package com.example.backend1.admin.dto;

import com.example.backend1.diagnosis.domain.IssueType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.Set;

public class AdminCompanyDtos {

    public record CreateRequest(
            @NotBlank @Size(max = 200) String name,
            @Size(max = 20) String businessRegistrationNumber,
            @Size(max = 100) String representativeName,
            @Size(max = 30) String phone,
            @Size(max = 255) String email,
            @Size(max = 500) String addressLine,
            @Size(max = 20) String postalCode,
            @Size(max = 200) String serviceRegionLabel,
            Double latitude,
            Double longitude,
            Set<IssueType> specialties,
            Integer minEstimatedQuoteKrw,
            Integer maxEstimatedQuoteKrw,
            @Size(max = 2000) String capabilityNote,
            Boolean active,
            @Size(max = 2000) String adminMemo
    ) {}

    public record UpdateRequest(
            @Size(max = 200) String name,
            @Size(max = 20) String businessRegistrationNumber,
            @Size(max = 100) String representativeName,
            @Size(max = 30) String phone,
            @Size(max = 255) String email,
            @Size(max = 500) String addressLine,
            @Size(max = 20) String postalCode,
            @Size(max = 200) String serviceRegionLabel,
            Double latitude,
            Double longitude,
            Set<IssueType> specialties,
            Integer minEstimatedQuoteKrw,
            Integer maxEstimatedQuoteKrw,
            @Size(max = 2000) String capabilityNote,
            Boolean active,
            @Size(max = 2000) String adminMemo
    ) {}

    public record CompanyListItem(
            Long id,
            String username,
            String name,
            String address,
            String serviceRegionLabel,
            boolean active,
            String status,
            boolean partner,
            Integer partnerPriority,
            OffsetDateTime createdAt
    ) {}

    public record CompanyResponse(
            Long id,
            String username,
            String name,
            String businessRegistrationNumber,
            String representativeName,
            String phone,
            String email,
            String addressLine,
            String postalCode,
            String serviceRegionLabel,
            Double latitude,
            Double longitude,
            Set<IssueType> specialties,
            Integer minEstimatedQuoteKrw,
            Integer maxEstimatedQuoteKrw,
            String capabilityNote,
            boolean active,
            String status,
            boolean partner,
            Integer partnerPriority,
            String adminMemo,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {}

    public record SetActiveRequest(boolean active) {}

    public record SetStatusRequest(
            @NotBlank String status
    ) {}
}