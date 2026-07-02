package com.example.backend1.diagnosis.service;

import com.example.backend1.ai.DecisionService;
import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.diagnosis.domain.AnalysisStatus;
import com.example.backend1.diagnosis.domain.IssueType;
import com.example.backend1.diagnosis.repo.DiagnosisRepository;
import com.example.backend1.history.repo.HistoryRepository;
import com.example.backend1.report.service.ReportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Random;

@Service
public class AnalysisJobService {

    private static final Logger log = LoggerFactory.getLogger(AnalysisJobService.class);

    private final DiagnosisRepository diagnosisRepository;
    private final HistoryRepository historyRepository;
    private final ReportService reportService;

    public AnalysisJobService(
            DiagnosisRepository diagnosisRepository,
            HistoryRepository historyRepository,
            ReportService reportService
    ) {
        this.diagnosisRepository = diagnosisRepository;
        this.historyRepository = historyRepository;
        this.reportService = reportService;
    }

    @Async
    @Transactional
    public void run(String username, Long diagnosisId, Long historyId, List<String> imageKeys) {

        try {
            // 트랜잭션 commit 전에 조회하는 문제 방지
            Thread.sleep(300);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("AnalysisJob 초기 대기 중 인터럽트 발생: diagnosisId={}", diagnosisId);
        }

        // diagnosis 조회 재시도 로직
        var diagnosisOpt = diagnosisRepository.findByIdAndUserUsername(diagnosisId, username);
        int retry = 0;

        while (diagnosisOpt.isEmpty() && retry < 5) {
            try {
                Thread.sleep(200);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("AnalysisJob 재시도 대기 중 인터럽트 발생: diagnosisId={}", diagnosisId);
            }
            diagnosisOpt = diagnosisRepository.findByIdAndUserUsername(diagnosisId, username);
            retry++;
        }

        var diagnosis = diagnosisOpt
                .orElseThrow(() -> new ApiException(ErrorCode.DIAGNOSIS_NOT_FOUND));

        var history = historyRepository.findById(historyId)
                .orElseThrow(() -> new ApiException(ErrorCode.HISTORY_NOT_FOUND));

        try {
            log.info("AI 분석 시작 diagnosisId={}", diagnosisId);

            Random random = new Random();
            int risk = random.nextInt(100);

            IssueType[] types = {
                    IssueType.CRACK,
                    IssueType.LEAK,
                    IssueType.MOLD,
                    IssueType.DAMAGE
            };

            IssueType issueType = types[random.nextInt(types.length)];

            diagnosis.updateFromAiResult(
                    AnalysisStatus.COMPLETED,
                    risk,
                    issueType
            );

            history.refreshFromDiagnosis();

            List<String> reasons = List.of(issueType + " 문제가 감지되었습니다.");
            List<String> cautions = List.of("추가 손상 여부를 확인하세요.");

            DecisionService.Estimate estimate;

            if (risk >= 70) {
                estimate = new DecisionService.Estimate("HIGH", 70000, 150000);
            } else if (risk >= 40) {
                estimate = new DecisionService.Estimate("MEDIUM", 30000, 70000);
            } else {
                estimate = new DecisionService.Estimate("LOW", 10000, 30000);
            }

            reportService.generateAndAttach(
                    diagnosis.getId(),
                    "분석 결과 요약",
                    0.85,
                    risk >= 70 ? "PRO" : "DIY",
                    reasons,
                    cautions,
                    estimate
            );

            log.info("AI 분석 완료 diagnosisId={}", diagnosisId);

        } catch (Exception e) {

            log.error("AI 분석 실패", e);

            diagnosis.updateFromAiResult(
                    AnalysisStatus.FAILED,
                    diagnosis.getRiskScore(),
                    diagnosis.getIssueType()
            );

            history.refreshFromDiagnosis();
        }
    }
}