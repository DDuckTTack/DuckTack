package com.example.backend1.history.controller;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ApiResponse;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.diagnosis.domain.AnalysisStatus;
import com.example.backend1.diagnosis.domain.IssueType;
import com.example.backend1.history.dto.HistoryDtos;
import com.example.backend1.history.service.HistoryService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/histories")
@SecurityRequirement(name = "bearerAuth")
public class HistoryController {

    private final HistoryService historyService;

    public HistoryController(HistoryService historyService) {
        this.historyService = historyService;
    }

    /* =========================
       History 목록 조회 + 필터
       ========================= */
    @GetMapping
    public ApiResponse<Page<HistoryDtos.HistoryItem>> list(
            Authentication authentication,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            OffsetDateTime from,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            OffsetDateTime to,

            @RequestParam(required = false)
            List<AnalysisStatus> status,

            @RequestParam(required = false)
            List<IssueType> issueType,

            @RequestParam(required = false)
            Integer riskMin,

            @RequestParam(required = false)
            Integer riskMax,

            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        if (authentication == null) {
            throw new ApiException(ErrorCode.AUTH_FAILED);
        }

        return ApiResponse.ok(
                historyService.list(
                        authentication.getName(),
                        from,
                        to,
                        status,
                        issueType,
                        riskMin,
                        riskMax,
                        pageable
                )
        );
    }

    /* =========================
       History 상세 조회
       ========================= */
    @GetMapping("/{id}")
    public ApiResponse<HistoryDtos.HistoryDetail> detail(
            Authentication authentication,
            @PathVariable Long id
    ) {
        if (authentication == null) {
            throw new ApiException(ErrorCode.AUTH_FAILED);
        }

        return ApiResponse.ok(
                historyService.detail(authentication.getName(), id)
        );
    }

    /* =========================
       History 선택 삭제
       ========================= */
    @DeleteMapping
    public ApiResponse<Void> bulkDelete(
            Authentication authentication,
            @RequestBody @Valid HistoryDtos.BulkDeleteRequest req
    ) {
        if (authentication == null) {
            throw new ApiException(ErrorCode.AUTH_FAILED);
        }

        historyService.bulkDelete(authentication.getName(), req.ids());
        return ApiResponse.ok("deleted", null);
    }
}