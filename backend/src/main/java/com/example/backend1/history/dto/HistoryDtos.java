package com.example.backend1.history.dto;

import com.example.backend1.diagnosis.domain.AnalysisStatus;
import com.example.backend1.diagnosis.domain.IssueType;
import jakarta.validation.constraints.NotEmpty;

import java.time.OffsetDateTime;
import java.util.List;

public class HistoryDtos {

  public record HistoryItem(
          Long id,
          Long diagnosisId,
          AnalysisStatus status,
          Integer riskScore,
          IssueType issueType,
          Double areaRatio,
          OffsetDateTime createdAt,

          Long reservationId,
          String reservationStatus,
          Long companyId,
          String expertVendorName,
          String expertVendorPhone,
          String kakaoPlaceId,
          String kakaoPlaceName,
          String kakaoPlacePhone,

          String repairCompletedDate,
          Integer repairTotalCost,
          String repairSummary,

          Boolean reviewWritten
  ) {}

  public record ReportMeta(
          String storageKey,
          String contentType,
          long sizeBytes
  ) {}

  public record HistoryDetail(
          Long id,
          Long diagnosisId,
          AnalysisStatus status,
          Integer riskScore,
          IssueType issueType,
          Double areaRatio,
          OffsetDateTime createdAt,
          ReportMeta report,

          String imageUrl,

          Long reservationId,
          String reservationStatus,
          Long companyId,
          String expertVendorName,
          String expertVendorPhone,
          String kakaoPlaceId,
          String kakaoPlaceName,
          String kakaoPlacePhone,

          String repairCompletedDate,
          Integer repairTotalCost,
          String repairSummary,

          Boolean reviewWritten
  ) {}

  public record BulkDeleteRequest(
          @NotEmpty List<Long> ids
  ) {}
}
