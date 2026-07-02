package com.example.backend1.history.service;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.diagnosis.domain.AnalysisStatus;
import com.example.backend1.diagnosis.domain.IssueType;
import com.example.backend1.history.dto.HistoryDtos;
import com.example.backend1.history.repo.HistoryRepository;
import com.example.backend1.reservation.domain.Reservation;
import com.example.backend1.review.repo.ReviewRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.backend1.user.repo.UserRepository;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class HistoryService {

  private static final Logger log = LoggerFactory.getLogger(HistoryService.class);

  private final HistoryRepository historyRepository;
  private final UserRepository userRepository;
  private final ReviewRepository reviewRepository;
  private final ObjectMapper objectMapper;

  public HistoryService(
          HistoryRepository historyRepository,
          UserRepository userRepository,
          ReviewRepository reviewRepository,
          ObjectMapper objectMapper
  ) {
    this.historyRepository = historyRepository;
    this.userRepository = userRepository;
    this.reviewRepository = reviewRepository;
    this.objectMapper = objectMapper;
  }

  @Transactional(readOnly = true)
  public Page<HistoryDtos.HistoryItem> list(
          String username,
          OffsetDateTime from,
          OffsetDateTime to,
          List<AnalysisStatus> statuses,
          List<IssueType> issueTypes,
          Integer riskMin,
          Integer riskMax,
          Pageable pageable
  ) {
    var user = userRepository.findByUsername(username)
            .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

    OffsetDateTime f = (from != null) ? from : OffsetDateTime.now().minusYears(10);
    OffsetDateTime t = (to != null) ? to : OffsetDateTime.now().plusDays(1);
    int rMin = (riskMin != null) ? riskMin : 0;
    int rMax = (riskMax != null) ? riskMax : 100;

    Specification<HistoryEntity> spec = (root, query, cb) -> {
      List<Predicate> p = new ArrayList<>();

      p.add(cb.equal(root.get("user").get("id"), user.getId()));
      p.add(cb.between(root.get("createdAt"), f, t));
      p.add(cb.isNotNull(root.get("riskScore")));
      p.add(cb.between(root.get("riskScore"), rMin, rMax));

      if (statuses != null && !statuses.isEmpty()) {
        p.add(root.get("status").in(statuses));
      }

      if (issueTypes != null && !issueTypes.isEmpty()) {
        p.add(root.get("issueType").in(issueTypes));
      }

      return cb.and(p.toArray(new Predicate[0]));
    };

    Page<HistoryEntity> page = historyRepository.findAll(spec, pageable);
    return page.map(this::toHistoryItem);
  }

  @Transactional(readOnly = true)
  public HistoryDtos.HistoryDetail detail(String username, Long id) {
    var user = userRepository.findByUsername(username)
            .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

    HistoryEntity h = historyRepository.findById(id)
            .filter(x -> x.getUser().getId().equals(user.getId()))
            .orElseThrow(() -> new ApiException(ErrorCode.HISTORY_NOT_FOUND));

    HistoryDtos.ReportMeta meta = null;
    if (h.getDiagnosis() != null && h.getDiagnosis().getReport() != null) {
      var report = h.getDiagnosis().getReport();
      meta = new HistoryDtos.ReportMeta(
              report.getStorageKey(),
              report.getContentType(),
              report.getSizeBytes()
      );
    } else if (h.getDiagnosisResult() != null && h.getDiagnosisResult().getPdfStorageKey() != null) {
      meta = new HistoryDtos.ReportMeta(
              h.getDiagnosisResult().getPdfStorageKey(),
              "application/pdf",
              0L
      );
    }

    Long diagnosisId = h.resolveDiagnosisId();

    String imageUrl = null;
    if (h.getDiagnosisResult() != null) {
      imageUrl = h.getDiagnosisResult().getImageUrl();
    }

    VendorInfo vendorInfo = resolveVendorInfo(h);

    return new HistoryDtos.HistoryDetail(
            h.getId(),
            diagnosisId,
            h.getStatus(),
            h.getRiskScore(),
            h.getIssueType(),
            resolveMaxAreaRatio(h),
            h.getCreatedAt(),
            meta,
            imageUrl,

            vendorInfo.reservationId(),
            vendorInfo.reservationStatus(),
            vendorInfo.companyId(),
            vendorInfo.expertVendorName(),
            vendorInfo.expertVendorPhone(),
            vendorInfo.kakaoPlaceId(),
            vendorInfo.kakaoPlaceName(),
            vendorInfo.kakaoPlacePhone(),

            vendorInfo.repairCompletedDate(),
            vendorInfo.repairTotalCost(),
            vendorInfo.repairSummary(),

            reviewRepository.existsByHistoryId(h.getId())
    );
  }

  @Transactional
  public void bulkDelete(String username, List<Long> ids) {
    var user = userRepository.findByUsername(username)
            .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

    historyRepository.deleteByIdInAndUserId(ids, user.getId());
    log.info("History deleted: user={}, count={}", username, ids.size());
  }

  private HistoryDtos.HistoryItem toHistoryItem(HistoryEntity h) {
    Long diagnosisId = h.resolveDiagnosisId();
    VendorInfo vendorInfo = resolveVendorInfo(h);

    return new HistoryDtos.HistoryItem(
            h.getId(),
            diagnosisId,
            h.getStatus(),
            h.getRiskScore(),
            h.getIssueType(),
            resolveMaxAreaRatio(h),
            h.getCreatedAt(),

            vendorInfo.reservationId(),
            vendorInfo.reservationStatus(),
            vendorInfo.companyId(),
            vendorInfo.expertVendorName(),
            vendorInfo.expertVendorPhone(),
            vendorInfo.kakaoPlaceId(),
            vendorInfo.kakaoPlaceName(),
            vendorInfo.kakaoPlacePhone(),

            vendorInfo.repairCompletedDate(),
            vendorInfo.repairTotalCost(),
            vendorInfo.repairSummary(),

            reviewRepository.existsByHistoryId(h.getId())
    );
  }


  private Double resolveMaxAreaRatio(HistoryEntity h) {
    if (h == null || h.getDiagnosisResult() == null) {
      return null;
    }

    String json = h.getDiagnosisResult().getYoloRawJson();
    if (json == null || json.isBlank()) {
      return null;
    }

    try {
      JsonNode root = objectMapper.readTree(json);
      JsonNode detections = root.path("detections");
      if (!detections.isArray()) {
        return null;
      }

      double max = -1.0;
      for (JsonNode detection : detections) {
        JsonNode areaNode = detection.has("area_ratio")
                ? detection.get("area_ratio")
                : detection.get("areaRatio");

        if (areaNode != null && areaNode.isNumber()) {
          max = Math.max(max, areaNode.asDouble());
        }
      }

      return max >= 0 ? max : null;
    } catch (Exception e) {
      log.warn("YOLO areaRatio 파싱 실패: historyId={}, message={}", h.getId(), e.getMessage());
      return null;
    }
  }

  private VendorInfo resolveVendorInfo(HistoryEntity h) {
    Reservation reservation = h.getReservation();

    if (reservation == null) {
      return new VendorInfo(null, null, null, null, null, null, null, null, null, null, null);
    }

    Long reservationId = reservation.getId();
    String reservationStatus = reservation.getStatus() != null
            ? reservation.getStatus().name()
            : null;

    Long companyId = null;
    String expertVendorName = null;
    String expertVendorPhone = null;
    String kakaoPlaceId = null;
    String kakaoPlaceName = null;
    String kakaoPlacePhone = null;

    if (reservation.getCompany() != null) {
      var company = reservation.getCompany();

      companyId = company.getId();
      expertVendorName = company.getName();
      expertVendorPhone = company.getPhone();

      kakaoPlaceId = company.getKakaoPlaceId();
      kakaoPlaceName = company.getName();
      kakaoPlacePhone = company.getPhone();
    }

    String repairCompletedDate = reservation.getRepairCompletedDate() != null
            ? reservation.getRepairCompletedDate().toString()
            : null;

    return new VendorInfo(
            reservationId,
            reservationStatus,
            companyId,
            expertVendorName,
            expertVendorPhone,
            kakaoPlaceId,
            kakaoPlaceName,
            kakaoPlacePhone,
            repairCompletedDate,
            reservation.getRepairTotalCost(),
            reservation.getRepairSummary()
    );
  }

  private record VendorInfo(
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
          String repairSummary
  ) {}
}
