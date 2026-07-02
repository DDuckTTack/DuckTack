package com.example.backend1.report.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.report.dto.ReportDraftDto;
import com.example.backend1.report.service.ReportService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@SecurityRequirement(name = "bearerAuth")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    // =========================
    // ✅ 이미지 업로드 (핵심 API)
    // =========================
    @PostMapping(value = "/images/upload", consumes = "multipart/form-data")
    public ApiResponse<List<String>> uploadReportImages(
            Authentication authentication,
            @RequestParam Long diagnosisId,
            @RequestParam String type,
            @RequestParam("files") List<MultipartFile> files
    )

    {
        return ApiResponse.ok(
                reportService.uploadImages(
                        authentication.getName(),
                        diagnosisId,
                        files,
                        type
                )
        );
    }

    // =========================
    // PDF 다운로드 (PC용)
    // =========================
    @GetMapping("/diagnosis/{diagnosisId}/download")
    public ResponseEntity<byte[]> download(
            Authentication authentication,
            @PathVariable Long diagnosisId
    ) {
        byte[] pdf = reportService.downloadByDiagnosisId(authentication.getName(), diagnosisId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "application/pdf")
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"report.pdf\"")
                .body(pdf);
    }

    // =========================
    // PDF 생성
    // =========================
    @PostMapping("/diagnosis/{diagnosisId}/generate")
    public ApiResponse<String> generate(
            Authentication authentication,
            @PathVariable Long diagnosisId
    ) {
        reportService.generateForUser(authentication.getName(), diagnosisId);
        return ApiResponse.ok("generated");
    }

    // =========================
    // 모바일 PDF URL
    // =========================
    @GetMapping("/diagnosis/{diagnosisId}/pdf-url")
    public ApiResponse<String> getPdfUrl(
            Authentication authentication,
            @PathVariable Long diagnosisId
    ) {
        String url = reportService.getPdfPublicUrl(authentication.getName(), diagnosisId);
        return ApiResponse.ok(url);
    }

    // =========================
    // 드래프트 조회
    // =========================
    @GetMapping("/diagnosis/{diagnosisId}/draft")
    public ApiResponse<ReportDraftDto.DraftResponse> getDraft(
            Authentication authentication,
            @PathVariable Long diagnosisId
    ) {
        return ApiResponse.ok(
                reportService.getDraft(authentication.getName(), diagnosisId)
        );
    }

    // =========================
    // 드래프트 저장
    // =========================
    @PutMapping("/diagnosis/{diagnosisId}/draft")
    public ApiResponse<ReportDraftDto.DraftResponse> saveDraft(
            Authentication authentication,
            @PathVariable Long diagnosisId,
            @RequestBody ReportDraftDto.DraftRequest req
    ) {
        return ApiResponse.ok(
                reportService.saveDraft(authentication.getName(), diagnosisId, req)
        );
    }

    // =========================
    // 내 리포트 목록
    // =========================
    @GetMapping("/my")
    public ApiResponse<?> myReports(Authentication authentication) {
        return ApiResponse.ok(reportService.getMyReports(authentication.getName()));
    }

    // =========================
    // 상태 맵
    // =========================
    @GetMapping("/status-map")
    public ApiResponse<?> statusMap(Authentication authentication) {
        return ApiResponse.ok(reportService.getStatusMap(authentication.getName()));
    }

    // =========================
    // 프론트 생성 PDF 업로드
    // =========================
    @PostMapping(value = "/diagnosis/{diagnosisId}/frontend-pdf", consumes = "multipart/form-data")
    public ApiResponse<java.util.Map<String, Object>> uploadFrontendPdf(
            Authentication authentication,
            @PathVariable Long diagnosisId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "templateVersion", required = false) String templateVersion
    ) {
        return ApiResponse.ok(
                reportService.uploadFrontendPdf(authentication.getName(), diagnosisId, file)
        );
    }

    @DeleteMapping("/diagnosis/{diagnosisId}")
    public ApiResponse<String> deleteReport(
            Authentication authentication,
            @PathVariable Long diagnosisId
    ) {
        reportService.deleteReport(authentication.getName(), diagnosisId);
        return ApiResponse.ok("deleted");
    }
}