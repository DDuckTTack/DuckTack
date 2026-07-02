package com.example.backend1.expert.service;

import com.example.backend1.company.domain.Company;
import com.example.backend1.company.repo.CompanyRepository;
import com.example.backend1.diagnosis.domain.IssueType;
import com.example.backend1.expert.dto.ExpertDtos;
import com.example.backend1.review.dto.ReviewDtos;
import com.example.backend1.review.service.ReviewService;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 프론트엔드 /api/experts/vendors 용 서비스.
 * Company 엔티티를 ExpertVendor DTO 로 변환하며,
 * region / issueType 필터와 price/rating 정렬을 지원한다.
 *
 * 설계 원칙:
 *  - 어떤 파라미터가 null 이거나 이상해도 예외를 던지지 않는다.
 *  - 필터 결과가 비어도 정상적으로 빈 리스트를 돌려준다.
 */
@Service
public class ExpertService {

    private final CompanyRepository companyRepository;
    private final ReviewService reviewService;

    public ExpertService(CompanyRepository companyRepository,
                         ReviewService reviewService) {
        this.companyRepository = companyRepository;
        this.reviewService = reviewService;
    }

    @Transactional(readOnly = true)
    public List<ExpertDtos.ExpertVendor> listVendors(String region,
                                                     String issueTypeRaw,
                                                     String sortKey,
                                                     String direction) {

        List<Company> companies;

        try {
            companies = companyRepository
                    .findByActive(true, Pageable.unpaged())
                    .getContent();
        } catch (Exception e) {
            companies = Collections.emptyList();
        }

        if (companies == null) {
            companies = Collections.emptyList();
        }

        final IssueType issueType = parseIssueType(issueTypeRaw);
        final String normalizedRegion =
                (region == null) ? "" : region.trim();

        List<Company> filtered = companies.stream()
                .filter(Objects::nonNull)
                .filter(c -> matchesRegion(c, normalizedRegion))
                .filter(c -> matchesIssueType(c, issueType))
                .collect(Collectors.toList());

        // 리뷰 통계 batch 조회
        List<Long> ids = filtered.stream()
                .map(Company::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        Map<Long, ReviewDtos.ReviewStats> statsMap =
                reviewService.getSummaryByCompanyIds(ids);

        List<ExpertDtos.ExpertVendor> result = filtered.stream()
                .map(c -> toVendor(c, statsMap.get(c.getId())))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        // 정렬 키 정규화
        String key =
                (sortKey == null) ? "price" : sortKey.trim().toLowerCase();

        String dir =
                (direction == null) ? "asc" : direction.trim().toLowerCase();

        Comparator<ExpertDtos.ExpertVendor> comparator;

        if ("rating".equals(key)) {
            comparator = Comparator.comparingDouble(
                    v -> v.avgRating() != null ? v.avgRating() : 0.0
            );
        } else {

            comparator = Comparator.comparingInt(
                    ExpertDtos.ExpertVendor::minPrice
            );
        }

        if ("desc".equals(dir)) {
            comparator = comparator.reversed();
        }

        Comparator<ExpertDtos.ExpertVendor> idTieBreaker =
                Comparator.comparingLong(
                        v -> v.id() == null
                                ? Long.MAX_VALUE
                                : v.id()
                );

        comparator = comparator.thenComparing(idTieBreaker);

        result.sort(comparator);

        return result;
    }

    // ─────────────────────────────────────────────
    // 내부 유틸
    // ─────────────────────────────────────────────

    private boolean matchesRegion(Company c, String region) {

        if (region.isEmpty()) {
            return true;
        }

        String label = c.getServiceRegionLabel();

        // 지역 정보 없으면 전국 취급
        if (label == null || label.isBlank()) {
            return true;
        }

        return label.contains(region);
    }

    private boolean matchesIssueType(Company c,
                                     IssueType issueType) {

        if (issueType == null) {
            return true;
        }

        Set<IssueType> specialties;

        try {
            specialties = c.getSpecialties();
        } catch (Exception e) {
            specialties = null;
        }

        // specialties 미지정이면 전체 가능 취급
        if (specialties == null || specialties.isEmpty()) {
            return true;
        }

        return specialties.contains(issueType);
    }

    private IssueType parseIssueType(String raw) {

        if (raw == null || raw.isBlank()) {
            return null;
        }

        try {
            return IssueType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private ExpertDtos.ExpertVendor toVendor(
            Company c,
            ReviewDtos.ReviewStats stats
    ) {

        if (c == null) {
            return null;
        }

        String name = nullToEmpty(c.getName());
        String phone = nullToEmpty(c.getPhone());
        String addressLine = nullToEmpty(c.getAddressLine());
        String serviceRegion = nullToEmpty(c.getServiceRegionLabel());
        String capNote = c.getCapabilityNote();

        List<String> coverage = new ArrayList<>();

        if (!serviceRegion.isBlank()) {

            for (String part : serviceRegion.split("[,/·|]+")) {

                String t =
                        (part == null) ? "" : part.trim();

                if (!t.isEmpty()) {
                    coverage.add(t);
                }
            }
        }

        if (coverage.isEmpty()) {
            coverage.add("전국");
        }

        // 리뷰 정보
        Double avgRating =
                (stats != null && stats.reviewCount() > 0)
                        ? stats.avgRating()
                        : null;

        int reviewCount =
                (stats != null)
                        ? stats.reviewCount()
                        : 0;

        Integer min = c.getMinEstimatedQuoteKrw();
        Integer max = c.getMaxEstimatedQuoteKrw();

        int minPrice =
                (min == null || min < 0)
                        ? 0
                        : min;

        String intro =
                (capNote == null || capNote.isBlank())
                        ? (name.isEmpty()
                        ? "전문 수리 서비스를 제공합니다."
                        : name + " 의 전문 수리 서비스입니다.")
                        : capNote;

        return new ExpertDtos.ExpertVendor(
                c.getId(),
                name,
                avgRating,
                reviewCount,
                minPrice,
                max,
                phone,
                intro,
                coverage,
                addressLine,
                serviceRegion,
                null,
                c.getLatitude(),
                c.getLongitude()
        );
    }

    private String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}