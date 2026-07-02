package com.example.backend1.company.service;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.common.service.DistanceService;
import com.example.backend1.company.domain.Company;
import com.example.backend1.company.dto.CompanyDtos;
import com.example.backend1.company.repo.CompanyRepository;
import com.example.backend1.review.dto.ReviewDtos;
import com.example.backend1.review.service.ReviewService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class CompanyService {

    private static final Logger log = LoggerFactory.getLogger(CompanyService.class);

    private static final String APPROVED = "APPROVED";
    private static final int INITIAL_RADIUS_METERS = 10_000;
    private static final int EXPANDED_RADIUS_METERS = 20_000;
    private static final int MAX_EXTERNAL_RESULTS = 12;

    private final CompanyRepository companyRepository;
    private final DistanceService distanceService;
    private final NaverSearchClient naverSearchClient;
    private final KakaoLocalClient kakaoLocalClient;
    private final ReviewService reviewService;

    public CompanyService(CompanyRepository companyRepository,
                          DistanceService distanceService,
                          NaverSearchClient naverSearchClient,
                          KakaoLocalClient kakaoLocalClient,
                          ReviewService reviewService) {
        this.companyRepository = companyRepository;
        this.distanceService = distanceService;
        this.naverSearchClient = naverSearchClient;
        this.kakaoLocalClient = kakaoLocalClient;
        this.reviewService = reviewService;
    }

    /**
     * 일반 업체 목록.
     * 앱 기본 목록은 승인된 제휴업체만 보여준다.
     */
    @Transactional(readOnly = true)
    public Page<CompanyDtos.CompanyListItem> listActive(Pageable pageable) {
        return companyRepository
                .findByActiveTrueAndPartnerTrueAndStatusOrderByPartnerPriorityDescIdAsc(APPROVED, pageable)
                .map(this::toListItem);
    }

    /**
     * 업체 상세.
     * 제휴업체가 아니면 사용자 앱 상세 접근을 막는다.
     */
    @Transactional(readOnly = true)
    public CompanyDtos.CompanyDetail getActive(Long id) {
        Company c = companyRepository.findById(id)
                .filter(company -> company.isActive() && company.isPartner() && company.isApproved())
                .orElseThrow(() -> new ApiException(ErrorCode.COMPANY_NOT_FOUND));

        return toDetail(c);
    }

    /**
     * 기존 컨트롤러 호환용.
     */
    @Transactional(readOnly = true)
    public List<CompanyDtos.NearbyCompanyResponse> findNearby(
            double userLat,
            double userLon,
            String keyword
    ) {
        return findNearby(userLat, userLon, keyword, null);
    }

    /**
     * 내 주변 업체 찾기.
     *
     * 정책:
     * 1. region이 있으면 해당 지역의 승인된 제휴업체만 상단 노출
     * 2. 카카오 일반업체도 해당 region 기준으로 검색/필터링
     * 3. 제휴업체는 앱 예약 가능
     * 4. 카카오 일반업체는 앱 예약 불가, 전화/카카오 장소 페이지 연결용 placeUrl 제공
     */
    @Transactional(readOnly = true)
    public List<CompanyDtos.NearbyCompanyResponse> findNearby(
            double userLat,
            double userLon,
            String keyword,
            String region
    ) {
        String normalizedRegion = normalizeRegion(region);

        List<CompanyDtos.NearbyCompanyResponse> combined = new ArrayList<>();
        Set<String> partnerNameKeys = new HashSet<>();

        // =========================
        // 1. DB 제휴업체 조회
        // =========================
        List<Company> partners;

        try {
            if (normalizedRegion != null) {
                partners = companyRepository
                        .findByActiveTrueAndPartnerTrueAndStatusAndServiceRegionLabelOrderByPartnerPriorityDescIdAsc(
                                APPROVED,
                                normalizedRegion
                        );
            } else {
                partners = companyRepository
                        .findByActiveTrueAndPartnerTrueAndStatusOrderByPartnerPriorityDescIdAsc(APPROVED);
            }
        } catch (Exception e) {
            log.warn("[findNearby] DB 제휴업체 조회 실패. cause={}", e.toString());
            partners = Collections.emptyList();
        }

        Map<Long, Integer> priorityMap = partners.stream()
                .collect(Collectors.toMap(
                        Company::getId,
                        c -> c.getPartnerPriority() == null ? 0 : c.getPartnerPriority()
                ));

        int partnerCount = 0;
        int partnerNoGeo = 0;

        for (Company c : partners) {
            if (c == null) continue;

            Double lat = c.getLatitude();
            Double lng = c.getLongitude();

            Double distanceKm = null;
            if (lat != null && lng != null) {
                double d = distanceService.calculate(userLat, userLon, lat, lng);
                distanceKm = Math.round(d * 100) / 100.0;
            } else {
                partnerNoGeo++;
            }

            combined.add(new CompanyDtos.NearbyCompanyResponse(
                    c.getId(),
                    c.getName(),
                    c.getPhone(),
                    c.getAddressLine(),
                    c.getServiceRegionLabel(),
                    lat,
                    lng,
                    distanceKm,
                    true,
                    c.getKakaoPlaceId(),
                    null,
                    null,
                    0
            ));

            if (c.getName() != null) {
                partnerNameKeys.add(normalizeName(c.getName()));
            }

            partnerCount++;
        }

        // =========================
        // 2. 카카오 일반업체 검색
        // =========================
        int externalCount = 0;
        int externalSkippedDup = 0;
        int externalSkippedNoGeo = 0;
        int externalSkippedRegion = 0;

        List<CompanyDtos.NearbyCompanyResponse> externalResults = new ArrayList<>();
        Set<String> externalDedupKeys = new HashSet<>();

        try {
            List<String> keywordCandidates = buildKeywordCandidates(keyword, normalizedRegion);
            int[] radiuses = {INITIAL_RADIUS_METERS, EXPANDED_RADIUS_METERS};

            outer:
            for (int radius : radiuses) {
                for (String candidate : keywordCandidates) {
                    if (externalResults.size() >= MAX_EXTERNAL_RESULTS) break outer;

                    Map<String, Object> kakaoData =
                            kakaoLocalClient.searchKeyword(candidate, userLat, userLon, radius);

                    Object rawDocs = kakaoData == null ? null : kakaoData.get("documents");
                    if (!(rawDocs instanceof List<?> docList)) continue;

                    for (Object rawDoc : docList) {
                        if (externalResults.size() >= MAX_EXTERNAL_RESULTS) break;
                        if (!(rawDoc instanceof Map<?, ?> m)) continue;

                        Object xObj = m.get("x");
                        Object yObj = m.get("y");

                        if (xObj == null || yObj == null) {
                            externalSkippedNoGeo++;
                            continue;
                        }

                        double lat;
                        double lng;

                        try {
                            lat = Double.parseDouble(String.valueOf(yObj));
                            lng = Double.parseDouble(String.valueOf(xObj));
                        } catch (NumberFormatException e) {
                            externalSkippedNoGeo++;
                            continue;
                        }

                        Object nameObj = m.get("place_name");
                        String cleanName = nameObj == null ? "" : String.valueOf(nameObj).trim();

                        Object phoneObj = m.get("phone");
                        Object roadObj = m.get("road_address_name");
                        Object addrFallback = m.get("address_name");

                        String address = roadObj != null && !String.valueOf(roadObj).isBlank()
                                ? String.valueOf(roadObj)
                                : addrFallback == null ? null : String.valueOf(addrFallback);

                        // 지역 탭이 선택된 경우, 카카오 결과도 해당 지역만 남김
                        if (normalizedRegion != null && !matchesRegion(normalizedRegion, cleanName, address)) {
                            externalSkippedRegion++;
                            continue;
                        }

                        if (!cleanName.isBlank() && partnerNameKeys.contains(normalizeName(cleanName))) {
                            externalSkippedDup++;
                            continue;
                        }

                        String dedupKey = normalizeName(cleanName)
                                + "#"
                                + String.format(Locale.ROOT, "%.5f,%.5f", lat, lng);

                        if (!externalDedupKeys.add(dedupKey)) {
                            externalSkippedDup++;
                            continue;
                        }

                        double dist;
                        Object distObj = m.get("distance");

                        if (distObj != null && !String.valueOf(distObj).isBlank()) {
                            try {
                                dist = Double.parseDouble(String.valueOf(distObj)) / 1000.0;
                            } catch (NumberFormatException e) {
                                dist = distanceService.calculate(userLat, userLon, lat, lng);
                            }
                        } else {
                            dist = distanceService.calculate(userLat, userLon, lat, lng);
                        }

                        Object placeIdObj = m.get("id");
                        String kakaoPlaceId = placeIdObj == null ? null : String.valueOf(placeIdObj).trim();

                        Object placeUrlObj = m.get("place_url");
                        String placeUrl = placeUrlObj == null ? null : String.valueOf(placeUrlObj).trim();

                        externalResults.add(new CompanyDtos.NearbyCompanyResponse(
                                null,
                                cleanName,
                                phoneObj == null ? null : String.valueOf(phoneObj),
                                address,
                                normalizedRegion != null ? normalizedRegion : "기타",
                                lat,
                                lng,
                                Math.round(dist * 100) / 100.0,
                                false,
                                kakaoPlaceId,
                                placeUrl,
                                null,
                                0
                        ));

                        externalCount++;
                    }
                }
            }
        } catch (Exception e) {
            log.warn(
                    "[findNearby] 카카오 검색 실패. 제휴업체만 반환. keyword='{}', region='{}', cause={}",
                    keyword,
                    normalizedRegion,
                    e.toString()
            );
        }

        combined.addAll(externalResults);

        log.info(
                "[findNearby] keyword='{}' region='{}' partners={} noGeo={} kakao={} skipDup={} skipNoGeo={} skipRegion={}",
                keyword,
                normalizedRegion,
                partnerCount,
                partnerNoGeo,
                externalCount,
                externalSkippedDup,
                externalSkippedNoGeo,
                externalSkippedRegion
        );

        combined = attachReviewStats(combined);

        return combined.stream()
                .sorted(Comparator
                        .comparing(CompanyDtos.NearbyCompanyResponse::partner).reversed()
                        .thenComparing(r -> r.partner() ? regionOrder(r.serviceRegionLabel()) : 999)
                        .thenComparing(
                                r -> r.partner() && r.id() != null
                                        ? priorityMap.getOrDefault(r.id(), 0)
                                        : 0,
                                Comparator.reverseOrder()
                        )
                        .thenComparing(
                                CompanyDtos.NearbyCompanyResponse::distanceKm,
                                Comparator.nullsLast(Comparator.naturalOrder())
                        ))
                .collect(Collectors.toList());
    }

    private List<CompanyDtos.NearbyCompanyResponse> attachReviewStats(
            List<CompanyDtos.NearbyCompanyResponse> list) {

        List<Long> partnerIds = list.stream()
                .filter(r -> r.id() != null)
                .map(CompanyDtos.NearbyCompanyResponse::id)
                .collect(Collectors.toList());

        List<String> kakaoIds = list.stream()
                .filter(r -> r.kakaoPlaceId() != null)
                .map(CompanyDtos.NearbyCompanyResponse::kakaoPlaceId)
                .collect(Collectors.toList());

        Map<Long, ReviewDtos.ReviewStats> partnerStats =
                reviewService.getSummaryByCompanyIds(partnerIds);

        Map<String, ReviewDtos.ReviewStats> kakaoStats =
                reviewService.getSummaryByKakaoPlaceIds(kakaoIds);

        return list.stream().map(r -> {
            ReviewDtos.ReviewStats stats = r.id() != null
                    ? partnerStats.get(r.id())
                    : kakaoStats.get(r.kakaoPlaceId());

            if (stats == null) {
                return r;
            }

            return new CompanyDtos.NearbyCompanyResponse(
                    r.id(),
                    r.name(),
                    r.phone(),
                    r.address(),
                    r.serviceRegionLabel(),
                    r.latitude(),
                    r.longitude(),
                    r.distanceKm(),
                    r.partner(),
                    r.kakaoPlaceId(),
                    r.placeUrl(),
                    stats.avgRating(),
                    stats.reviewCount()
            );
        }).collect(Collectors.toList());
    }

    private List<String> buildKeywordCandidates(String keyword, String region) {
        String base = keyword == null || keyword.isBlank() ? "집수리" : keyword.trim();

        LinkedHashSet<String> candidates = new LinkedHashSet<>();

        if (region != null && !region.isBlank()) {
            candidates.add(region + " " + base);
        }

        candidates.add(base);

        String[] tokens = base.split("\\s+");
        if (tokens.length >= 2) {
            if (region != null && !region.isBlank()) {
                candidates.add(region + " " + tokens[tokens.length - 1]);
            }
            candidates.add(tokens[tokens.length - 1]);
        }

        if (base.contains("누수")) {
            addRegionKeyword(candidates, region, "누수탐지");
            addRegionKeyword(candidates, region, "배관");
            addRegionKeyword(candidates, region, "설비");
        } else if (base.contains("곰팡이")) {
            addRegionKeyword(candidates, region, "곰팡이제거");
            addRegionKeyword(candidates, region, "방수");
            addRegionKeyword(candidates, region, "집수리");
        } else if (base.contains("전기")) {
            addRegionKeyword(candidates, region, "전기공사");
            addRegionKeyword(candidates, region, "전기");
        } else {
            addRegionKeyword(candidates, region, "집수리");
        }

        return new ArrayList<>(candidates);
    }

    private void addRegionKeyword(LinkedHashSet<String> candidates, String region, String keyword) {
        if (region != null && !region.isBlank()) {
            candidates.add(region + " " + keyword);
        }
        candidates.add(keyword);
    }

    private String normalizeRegion(String region) {
        if (region == null || region.isBlank()) {
            return null;
        }

        String r = region.trim();

        return switch (r) {
            case "서울", "서울특별시" -> "서울";
            case "경기", "경기도" -> "경기";
            case "인천", "인천광역시" -> "인천";
            case "부산", "부산광역시" -> "부산";
            case "대구", "대구광역시" -> "대구";
            case "광주", "광주광역시" -> "광주";
            case "대전", "대전광역시" -> "대전";
            case "울산", "울산광역시" -> "울산";
            default -> r;
        };
    }

    private boolean matchesRegion(String region, String name, String address) {
        if (region == null || region.isBlank()) {
            return true;
        }

        String n = name == null ? "" : name;
        String a = address == null ? "" : address;

        return n.contains(region)
                || a.contains(region)
                || a.contains(toFullRegionName(region));
    }

    private String toFullRegionName(String region) {
        return switch (region) {
            case "서울" -> "서울특별시";
            case "경기" -> "경기도";
            case "인천" -> "인천광역시";
            case "부산" -> "부산광역시";
            case "대구" -> "대구광역시";
            case "광주" -> "광주광역시";
            case "대전" -> "대전광역시";
            case "울산" -> "울산광역시";
            default -> region;
        };
    }

    private int regionOrder(String region) {
        if (region == null) return 999;

        return switch (region) {
            case "서울" -> 1;
            case "경기" -> 2;
            case "인천" -> 3;
            case "부산" -> 4;
            case "대구" -> 5;
            case "광주" -> 6;
            case "대전" -> 7;
            case "울산" -> 8;
            default -> 999;
        };
    }

    private String normalizeName(String s) {
        if (s == null) return "";
        return s.replaceAll("[\\s\\p{Punct}]+", "").toLowerCase(Locale.ROOT);
    }

    private CompanyDtos.CompanyListItem toListItem(Company c) {
        return new CompanyDtos.CompanyListItem(
                c.getId(),
                c.getName(),
                c.getPhone(),
                c.getAddressLine(),
                c.getServiceRegionLabel(),
                new HashSet<>(c.getSpecialties()),
                c.getMinEstimatedQuoteKrw(),
                c.getMaxEstimatedQuoteKrw()
        );
    }

    private CompanyDtos.CompanyDetail toDetail(Company c) {
        return new CompanyDtos.CompanyDetail(
                c.getId(),
                c.getName(),
                c.getPhone(),
                c.getEmail(),
                c.getAddressLine(),
                c.getPostalCode(),
                c.getServiceRegionLabel(),
                c.getLatitude(),
                c.getLongitude(),
                new HashSet<>(c.getSpecialties()),
                c.getMinEstimatedQuoteKrw(),
                c.getMaxEstimatedQuoteKrw(),
                c.getCapabilityNote()
        );
    }
}
