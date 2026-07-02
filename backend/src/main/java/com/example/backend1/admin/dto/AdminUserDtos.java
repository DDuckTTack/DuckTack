package com.example.backend1.admin.dto;

import com.example.backend1.diagnosis.domain.AnalysisStatus;
import com.example.backend1.diagnosis.domain.IssueType;
import com.example.backend1.user.domain.RentType;
import com.example.backend1.user.domain.ResidenceType;
import com.example.backend1.user.domain.UserRole;

import java.time.OffsetDateTime;
import java.util.List;

public class AdminUserDtos {

    /** 목록용 */
    public record UserListItem(
            Long id,
            String name,
            String address
    ) {}

    /** 사용자 기본 정보 */
    public record UserDetail(
            Long id,
            String username,
            String email,
            UserRole role,
            String phoneNumber,
            String address,
            ResidenceType residenceType,
            RentType rentType,
            OffsetDateTime createdAt
    ) {}

    /** 사용자 상세 페이지 응답 */
    public record UserDetailResponse(
            UserDetail user,
            UserReservationStats stats,
            List<UserReservationItem> reservations
    ) {}

    /** 사용자 예약 통계 */
    public record UserReservationStats(
            long totalReservations,
            long acceptedReservations,
            long pendingReservations,
            long rejectedReservations,
            long doneReservations,
            long cancelledReservations,
            long noshowReservations,
            long reviewCount
    ) {}

    /** 사용자 예약 현황 항목 */
    public record UserReservationItem(
            Long id,
            Long companyId,
            String companyName,
            String status,
            String visitDate,
            String visitTime,
            String issueSummary,
            String requestNote,
            Boolean reviewWritten
    ) {}

    /** 관리자 - 특정 사용자의 진단 이력 항목 */
    public record UserHistoryItem(
            Long id,
            Long diagnosisId,
            AnalysisStatus status,
            Integer riskScore,
            IssueType issueType,
            OffsetDateTime createdAt
    ) {}
}
