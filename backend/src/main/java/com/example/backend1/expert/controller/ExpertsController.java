package com.example.backend1.expert.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.expert.dto.ExpertDtos;
import com.example.backend1.expert.service.ExpertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;

/**
 * 프론트엔드 `listExpertVendors()` 가 호출하는 엔드포인트.
 * GET /api/experts/vendors?region=..&issueType=..&sortKey=price|rating&direction=asc|desc
 *
 * 설계 원칙: "절대 500 을 내보내지 않는다."
 *  - 내부 서비스에서 어떠한 예외가 발생해도 빈 리스트로 응답한다.
 *  - 잘못된 파라미터(알 수 없는 issueType 등)도 400 으로 튕기지 않고 무시한다.
 */
@Tag(name = "Experts - Vendors")
@RestController
@RequestMapping("/api/experts")
public class ExpertsController {

    private static final Logger log = LoggerFactory.getLogger(ExpertsController.class);

    private final ExpertService expertService;

    public ExpertsController(ExpertService expertService) {
        this.expertService = expertService;
    }

    @Operation(summary = "전문가 업체 리스트 (지역/이슈타입/정렬 지원)")
    @GetMapping("/vendors")
    public ApiResponse<List<ExpertDtos.ExpertVendor>> listVendors(
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String issueType,
            @RequestParam(required = false, defaultValue = "price") String sortKey,
            @RequestParam(required = false, defaultValue = "asc") String direction
    ) {
        try {
            List<ExpertDtos.ExpertVendor> vendors =
                    expertService.listVendors(region, issueType, sortKey, direction);
            if (vendors == null) {
                vendors = Collections.<ExpertDtos.ExpertVendor>emptyList();
            }
            return ApiResponse.ok(vendors);
        } catch (Exception e) {
            // 방어적 폴백: 어떤 이유로든 실패하면 빈 리스트로 응답한다(프론트 UX 보호).
            log.warn("listVendors fallback due to: {}", e.toString());
            List<ExpertDtos.ExpertVendor> empty = Collections.<ExpertDtos.ExpertVendor>emptyList();
            return ApiResponse.ok(empty);
        }
    }
}
