package com.example.backend1.diagnosis.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.diagnosis.dto.DiagnosisFullResponse;
import com.example.backend1.diagnosis.service.DiagnosisOrchestrator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * AI 진단 API (YOLO + 위험도 + LLM 가이드 통합 흐름).
 *
 * <p>기존 비동기 분석 흐름({@code /api/analysis}) 과는 별개의 신규 동기 엔드포인트.
 *
 * <ul>
 *   <li>{@code POST /api/diagnosis} multipart 이미지 → 즉시 가이드 응답</li>
 *   <li>{@code GET  /api/diagnosis/{id}} 저장된 진단 결과 조회</li>
 *   <li>{@code GET  /api/diagnosis/me} 내 진단 이력 (페이지네이션)</li>
 * </ul>
 */
@Tag(name = "AI Diagnosis (YOLO + LLM)")
@RestController
@RequestMapping("/api/diagnosis")
@SecurityRequirement(name = "bearerAuth")
public class DiagnosisController {

    private final DiagnosisOrchestrator orchestrator;

    public DiagnosisController(DiagnosisOrchestrator orchestrator) {
        this.orchestrator = orchestrator;
    }

    @Operation(summary = "이미지 업로드 → AI 진단 (YOLO + LLM)")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<DiagnosisFullResponse> diagnose(
            Authentication authentication,
            @Parameter(description = "진단할 이미지 파일", required = true,
                    content = @Content(mediaType = MediaType.MULTIPART_FORM_DATA_VALUE,
                            schema = @Schema(type = "string", format = "binary")))
            @RequestParam("image") MultipartFile image,
            @Parameter(description = "HIGH 위험도라도 DIY 가이드 요청 여부 (기본값: false)")
            @RequestParam(value = "preferDiy", required = false, defaultValue = "false") boolean preferDiy
    ) {
        String username = authentication.getName();
        return ApiResponse.ok(orchestrator.diagnose(username, image, preferDiy));
    }

    @Operation(summary = "진단 결과 단건 조회")
    @GetMapping("/{id}")
    public ApiResponse<DiagnosisFullResponse> get(
            Authentication authentication,
            @PathVariable Long id
    ) {
        return ApiResponse.ok(orchestrator.get(authentication.getName(), id));
    }

    @Operation(summary = "내 진단 이력 (최신순)")
    @GetMapping("/me")
    public ApiResponse<Page<DiagnosisFullResponse>> myList(
            Authentication authentication,
            @PageableDefault(size = 10) Pageable pageable
    ) {
        return ApiResponse.ok(orchestrator.listMine(authentication.getName(), pageable));
    }
}
