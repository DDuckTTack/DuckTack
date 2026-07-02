package com.example.backend1.diagnosis.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.diagnosis.service.DiagnosisAnalysisService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.constraints.NotEmpty;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/analysis", "/api/analysis"})
@SecurityRequirement(name = "bearerAuth")
public class AnalysisController {

    private final DiagnosisAnalysisService analysisService;

    public AnalysisController(DiagnosisAnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @PostMapping
    public ApiResponse<DiagnosisAnalysisService.StartResult> analyze(
            Authentication authentication,
            @RequestBody AnalyzeRequest req
    ) {
        String username = authentication.getName();

        return ApiResponse.ok(
                analysisService.start(username, req.imageKeys())
        );
    }

    public record AnalyzeRequest(@NotEmpty List<String> imageKeys) {}
}