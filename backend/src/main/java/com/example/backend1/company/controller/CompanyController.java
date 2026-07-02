package com.example.backend1.company.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.company.dto.CompanyDtos;
import com.example.backend1.company.service.CompanyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 일반 사용자용 전문가 업체 조회 API.
 * active = false 인 업체는 자동으로 제외되므로 관리자가 숨김 처리한 업체는 노출되지 않는다.
 */
@Tag(name = "Company - Nearby Search")
@RestController
@RequestMapping("/api/companies")
public class CompanyController {

    private final CompanyService companyService;

    public CompanyController(CompanyService companyService) {
        this.companyService = companyService;
    }

    /**
     * 전문가 업체 목록 조회 (active=true 만)
     * GET /api/companies
     */
    @GetMapping
    public ApiResponse<Page<CompanyDtos.CompanyListItem>> list(
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        return ApiResponse.ok(companyService.listActive(pageable));
    }

    /**
     * 전문가 업체 상세 조회 (active=false 면 404)
     * GET /api/companies/{id}
     */
    @GetMapping("/{id}")
    public ApiResponse<CompanyDtos.CompanyDetail> get(@PathVariable Long id) {
        return ApiResponse.ok(companyService.getActive(id));
    }

    // =========================
    // ⭐ 추가: GPS 기반 근처 업체 조회
    // =========================
    /**
     * 근처 업체 조회 (거리 계산 포함)
     * POST /api/companies/nearby
     */
    @Operation(summary = "내 주변 업체 찾기 (GPS)")
    @GetMapping("/nearby")
    public ApiResponse<List<CompanyDtos.NearbyCompanyResponse>> getNearby(
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam(required = false, defaultValue = "집수리") String keyword,
            @RequestParam(required = false) String region
    ) {
        double normalizedLat = lat;
        double normalizedLon = lon;

        if (Math.abs(lat) > 90 && Math.abs(lon) <= 90) {
            normalizedLat = lon;
            normalizedLon = lat;
        }

        return ApiResponse.ok(
                companyService.findNearby(normalizedLat, normalizedLon, keyword, region)
        );
    }
}