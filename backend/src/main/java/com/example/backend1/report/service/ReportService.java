package com.example.backend1.report.service;

import com.example.backend1.ai.DecisionService;
import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.diagnosis.domain.Diagnosis;
import com.example.backend1.diagnosis.domain.DiagnosisResult;
import com.example.backend1.diagnosis.domain.ReportMetadata;
import com.example.backend1.diagnosis.repo.DiagnosisRepository;
import com.example.backend1.diagnosis.repo.DiagnosisResultRepository;
import com.example.backend1.history.repo.HistoryRepository;
import com.example.backend1.history.service.HistoryEntity;
import com.example.backend1.report.dto.ReportDraftDto;
import com.example.backend1.report.entity.ReportDraft;
import com.example.backend1.report.repo.ReportDraftRepository;
import com.example.backend1.reservation.domain.Reservation;
import com.example.backend1.storage.*;
import com.example.backend1.user.domain.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.*;

@Service
@Transactional
public class ReportService {

    private final DiagnosisRepository diagnosisRepository;
    private final DiagnosisResultRepository diagnosisResultRepository;
    private final ReportDraftRepository reportDraftRepository;
    private final ReportRenderer reportRenderer;
    private final PdfService pdfService;
    private final FileService fileService;
    private final FileStorage fileStorage;
    private final FileRecordRepository fileRecordRepository;
    private final HistoryRepository historyRepository;

    public ReportService(
            DiagnosisRepository diagnosisRepository,
            DiagnosisResultRepository diagnosisResultRepository,
            ReportDraftRepository reportDraftRepository,
            ReportRenderer reportRenderer,
            PdfService pdfService,
            FileService fileService,
            FileStorage fileStorage,
            FileRecordRepository fileRecordRepository,
            HistoryRepository historyRepository
    ) {
        this.diagnosisRepository = diagnosisRepository;
        this.diagnosisResultRepository = diagnosisResultRepository;
        this.reportDraftRepository = reportDraftRepository;
        this.reportRenderer = reportRenderer;
        this.pdfService = pdfService;
        this.fileService = fileService;
        this.fileStorage = fileStorage;
        this.fileRecordRepository = fileRecordRepository;
        this.historyRepository = historyRepository;
    }

    private record DiagnosisCtx(Diagnosis diagnosis, DiagnosisResult diagnosisResult, User user) {
        boolean isNewPipeline() { return diagnosisResult != null; }
    }

    private DiagnosisCtx resolveCtx(String username, Long id) {
        Optional<Diagnosis> d = diagnosisRepository.findByIdAndUserUsername(id, username);
        if (d.isPresent()) return new DiagnosisCtx(d.get(), null, d.get().getUser());

        DiagnosisResult dr = diagnosisResultRepository.findByIdAndUserUsername(id, username)
                .orElseThrow(() -> new ApiException(ErrorCode.DIAGNOSIS_NOT_FOUND));
        return new DiagnosisCtx(null, dr, dr.getUser());
    }

    @Transactional
    public ReportMetadata generateAndAttach(
            Long diagnosisId,
            String summary,
            double confidence,
            String decision,
            List<String> reasons,
            List<String> cautionNotes,
            DecisionService.Estimate estimate
    ) {
        Diagnosis diagnosis = diagnosisRepository.findById(diagnosisId)
                .orElseThrow(() -> new ApiException(ErrorCode.DIAGNOSIS_NOT_FOUND));

        ReportDraft draft = reportDraftRepository.findByDiagnosis_Id(diagnosisId).orElse(null);

        List<String> beforeImages = fileRecordRepository
                .findByDiagnosisIdAndCategory(diagnosisId, FileCategory.BEFORE_IMAGE)
                .stream()
                .map(f -> fileStorage.getPublicUrl(f.getStorageKey()))
                .toList();

        List<String> afterImages = fileRecordRepository
                .findByDiagnosisIdAndCategory(diagnosisId, FileCategory.AFTER_IMAGE)
                .stream()
                .map(f -> fileStorage.getPublicUrl(f.getStorageKey()))
                .toList();

        String html = reportRenderer.toHtml(
                diagnosis,
                summary,
                confidence,
                decision,
                reasons,
                cautionNotes,
                estimate,
                draft,
                beforeImages,
                afterImages
        );

        byte[] pdfBytes = pdfService.htmlToPdf(html);
        var saved = fileService.saveReportPdf(diagnosis.getUser().getUsername(), pdfBytes);

        ReportMetadata metadata;
        if (diagnosis.getReport() != null) {
            metadata = diagnosis.getReport();
            metadata.update(saved.key(), saved.contentType(), saved.sizeBytes());
        } else {
            metadata = new ReportMetadata(saved.key(), saved.contentType(), saved.sizeBytes());
            diagnosis.attachReport(metadata);
        }

        return metadata;
    }

    @Transactional
    public ReportDraftDto.DraftResponse saveDraft(String username, Long diagnosisId, ReportDraftDto.DraftRequest req) {
        DiagnosisCtx ctx = resolveCtx(username, diagnosisId);

        ReportDraft draft;
        if (ctx.isNewPipeline()) {
            draft = reportDraftRepository.findByDiagnosisResult_Id(diagnosisId)
                    .orElseGet(() -> reportDraftRepository.save(new ReportDraft(ctx.diagnosisResult())));
        } else {
            draft = reportDraftRepository.findByDiagnosis_Id(diagnosisId)
                    .orElseGet(() -> reportDraftRepository.save(new ReportDraft(ctx.diagnosis())));
        }

        LocalDate completionDate = parseDate(req.repairDate());

        draft.update(
                req.repairMethod(),
                completionDate,
                req.contractorName(),
                req.contractorContact(),
                req.repairSummary(),
                req.actualCostKrw(),
                req.notes(),
                req.totalCost(),
                req.diyMaterialsUsed(),
                req.diyMaterialCost(),
                req.diyWorkMemo()
        );

        reportDraftRepository.save(draft);
        reportDraftRepository.flush();

        return toDraftResponse(diagnosisId, draft, ctx);
    }

    @Transactional(readOnly = true)
    public String getPdfPublicUrl(String username, Long diagnosisId) {
        DiagnosisCtx ctx = resolveCtx(username, diagnosisId);

        if (ctx.isNewPipeline()) {
            DiagnosisResult dr = ctx.diagnosisResult();
            if (dr.getPdfStorageKey() == null) {
                throw new ApiException(ErrorCode.INVALID_INPUT, "PDF가 아직 생성되지 않았습니다.");
            }
            return fileStorage.getPublicUrl(dr.getPdfStorageKey());
        }

        Diagnosis diagnosis = ctx.diagnosis();
        if (diagnosis.getReport() == null) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "PDF가 아직 생성되지 않았습니다.");
        }
        return fileService.getOwnedPublicUrl(username, diagnosis.getReport().getStorageKey());
    }

    @Transactional(readOnly = true)
    public ReportDraftDto.DraftResponse getDraft(String username, Long diagnosisId) {
        DiagnosisCtx ctx = resolveCtx(username, diagnosisId);

        ReportDraft draft;
        if (ctx.isNewPipeline()) {
            draft = reportDraftRepository.findByDiagnosisResult_Id(diagnosisId).orElse(null);
        } else {
            draft = reportDraftRepository.findByDiagnosis_Id(diagnosisId).orElse(null);
        }

        return toDraftResponse(diagnosisId, draft, ctx);
    }

    @Transactional(readOnly = true)
    public byte[] downloadByDiagnosisId(String username, Long diagnosisId) {
        DiagnosisCtx ctx = resolveCtx(username, diagnosisId);

        if (ctx.isNewPipeline()) {
            DiagnosisResult dr = ctx.diagnosisResult();
            if (dr.getPdfStorageKey() == null) {
                throw new ApiException(ErrorCode.INVALID_INPUT, "PDF 없음");
            }
            return fileService.load(dr.getPdfStorageKey());
        }

        Diagnosis diagnosis = ctx.diagnosis();
        if (diagnosis.getReport() == null) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "PDF 없음");
        }
        return fileService.load(diagnosis.getReport().getStorageKey());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMyReports(String username) {
        List<Diagnosis> diagnoses = diagnosisRepository.findByUserUsername(username);

        return diagnoses.stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(d -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("diagnosisId", d.getId());
                    map.put("issueType", d.getIssueType());
                    map.put("riskScore", d.getRiskScore());
                    map.put("createdAt", d.getCreatedAt());

                    String status;
                    if (d.getReport() != null) status = "READY";
                    else if ("FAILED".equals(d.getStatus().name())) status = "FAILED";
                    else status = "GENERATING";

                    map.put("status", status);
                    return map;
                })
                .toList();
    }

    public List<String> uploadImages(String username, Long diagnosisId, List<MultipartFile> files, String type) {
        DiagnosisCtx ctx = resolveCtx(username, diagnosisId);
        User user = ctx.user();

        FileCategory category = type.equals("AFTER")
                ? FileCategory.AFTER_IMAGE
                : FileCategory.BEFORE_IMAGE;

        List<String> keys = new ArrayList<>();
        for (MultipartFile file : files) {
            StoredFile saved = fileStorage.save(file);
            FileRecord record = new FileRecord(user, category, saved, diagnosisId);
            fileRecordRepository.save(record);
            keys.add(saved.key());
        }

        return keys;
    }

    @Transactional
    public Map<String, Object> uploadFrontendPdf(String username, Long diagnosisId, MultipartFile file) {
        DiagnosisCtx ctx = resolveCtx(username, diagnosisId);

        StoredFile saved = fileStorage.save(file);
        String publicUrl = fileStorage.getPublicUrl(saved.key());

        if (ctx.isNewPipeline()) {
            DiagnosisResult dr = ctx.diagnosisResult();
            dr.attachPdf(saved.key(), publicUrl);
            diagnosisResultRepository.save(dr);
        } else {
            Diagnosis diagnosis = ctx.diagnosis();
            ReportMetadata metadata;
            if (diagnosis.getReport() != null) {
                metadata = diagnosis.getReport();
                metadata.update(saved.key(), saved.contentType(), saved.sizeBytes());
            } else {
                metadata = new ReportMetadata(saved.key(), saved.contentType(), saved.sizeBytes());
                diagnosis.attachReport(metadata);
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("storageKey", saved.key());
        result.put("url", publicUrl);
        result.put("contentType", saved.contentType());
        result.put("sizeBytes", saved.sizeBytes());
        return result;
    }

    @Transactional(readOnly = true)
    public Map<Long, String> getStatusMap(String username) {
        List<Diagnosis> diagnoses = diagnosisRepository.findByUserUsername(username);
        Map<Long, String> result = new HashMap<>();

        for (Diagnosis d : diagnoses) {
            String status;
            if (d.getReport() != null) status = "READY";
            else if ("FAILED".equals(d.getStatus().name())) status = "FAILED";
            else status = "GENERATING";

            result.put(d.getId(), status);
        }

        return result;
    }

    @Transactional
    public void deleteReport(String username, Long diagnosisId) {
        if (diagnosisId == null) {
            throw new IllegalArgumentException("diagnosisId is required");
        }

        DiagnosisCtx ctx = resolveCtx(username, diagnosisId);

        // 1. 후입력 드래프트 삭제
        ReportDraft draft = ctx.isNewPipeline()
                ? reportDraftRepository.findByDiagnosisResult_Id(diagnosisId).orElse(null)
                : reportDraftRepository.findByDiagnosis_Id(diagnosisId).orElse(null);

        if (draft != null) {
            reportDraftRepository.delete(draft);
        }

        // 2. PDF READY 상태 제거
        if (ctx.isNewPipeline()) {
            DiagnosisResult dr = ctx.diagnosisResult();
            dr.attachPdf(null, null);
            diagnosisResultRepository.save(dr);
        } else {
            Diagnosis diagnosis = ctx.diagnosis();
            diagnosis.attachReport(null);
            diagnosisRepository.save(diagnosis);
        }
    }

    @Transactional
    public void generateForUser(String username, Long diagnosisId) {
        DiagnosisCtx ctx = resolveCtx(username, diagnosisId);
        if (ctx.isNewPipeline()) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "새 파이프라인은 프론트 PDF 업로드를 사용하세요.");
        }

        Diagnosis diagnosis = ctx.diagnosis();
        DecisionService.Estimate estimate = buildEstimateFromRisk(diagnosis.getRiskScore());
        String decision = diagnosis.getRiskScore() >= 70 ? "PRO" : "DIY";

        generateAndAttach(
                diagnosisId,
                "AI 분석 결과 기반 리포트",
                0.0,
                decision,
                List.of("문제 감지됨"),
                List.of("추가 점검 필요"),
                estimate
        );
    }

    private ReportDraftDto.DraftResponse toDraftResponse(
            Long diagnosisId,
            ReportDraft draft,
            DiagnosisCtx ctx
    ) {
        List<String> beforeImageUris = resolveBeforeImageUris(diagnosisId, ctx);
        List<String> afterImageUris = resolveAfterImageUris(diagnosisId);
        Reservation reservation = resolveReservation(ctx, diagnosisId).orElse(null);

        String reservationRepairDate = null;
        String reservationContractorName = null;
        String reservationContractorContact = null;
        String reservationRepairSummary = null;
        Integer reservationActualCost = null;
        String reservationTotalCost = null;
        String reservationRepairMethod = null;

        if (reservation != null && reservation.getStatus() == Reservation.Status.DONE) {
            if (reservation.getRepairCompletedDate() != null) {
                reservationRepairDate = reservation.getRepairCompletedDate().toString();
            }

            if (reservation.getCompany() != null) {
                reservationContractorName = reservation.getCompany().getName();
                reservationContractorContact = reservation.getCompany().getPhone();
            }

            reservationRepairSummary = reservation.getRepairSummary();
            reservationActualCost = reservation.getRepairTotalCost();
            reservationTotalCost = reservation.getRepairTotalCost() != null
                    ? String.valueOf(reservation.getRepairTotalCost())
                    : null;
            reservationRepairMethod = "PRO";
        }

        if (draft == null) {
            return new ReportDraftDto.DraftResponse(
                    diagnosisId,
                    reservationRepairMethod,
                    reservationRepairDate,
                    reservationContractorName,
                    reservationContractorContact,
                    reservationRepairSummary,
                    reservationActualCost,
                    null,
                    reservationTotalCost,
                    null,
                    null,
                    null,
                    beforeImageUris,
                    afterImageUris,
                    null
            );
        }

        String draftRepairDate = draft.getCompletionDate() != null
                ? draft.getCompletionDate().toString()
                : null;

        return new ReportDraftDto.DraftResponse(
                diagnosisId,
                firstNonBlank(draft.getRepairMethod(), reservationRepairMethod),
                firstNonBlank(draftRepairDate, reservationRepairDate),
                firstNonBlank(draft.getContractorName(), reservationContractorName),
                firstNonBlank(draft.getContractorContact(), reservationContractorContact),
                firstNonBlank(draft.getRepairSummary(), reservationRepairSummary),
                firstNonNull(draft.getActualCostKrw(), reservationActualCost),
                draft.getNotes(),
                firstNonBlank(draft.getTotalCost(), reservationTotalCost),
                draft.getDiyMaterialsUsed(),
                draft.getDiyMaterialCost(),
                draft.getDiyWorkMemo(),
                beforeImageUris,
                afterImageUris,
                draft.getUpdatedAt() != null ? draft.getUpdatedAt().toLocalDateTime() : null
        );
    }

    private Optional<Reservation> resolveReservation(DiagnosisCtx ctx, Long diagnosisId) {
        Long userId = ctx.user().getId();

        Optional<HistoryEntity> history;
        if (ctx.isNewPipeline()) {
            history = historyRepository.findByUserIdAndDiagnosisResultId(userId, diagnosisId);
        } else {
            history = historyRepository.findByUserIdAndDiagnosisId(userId, diagnosisId);
        }

        return history.map(HistoryEntity::getReservation);
    }

    private List<String> resolveBeforeImageUris(Long diagnosisId, DiagnosisCtx ctx) {
        List<String> result = new ArrayList<>();

        if (ctx.isNewPipeline()) {
            DiagnosisResult dr = ctx.diagnosisResult();
            if (dr.getImageUrl() != null && !dr.getImageUrl().isBlank()) {
                result.add(dr.getImageUrl());
            }
            return result;
        }

        return fileRecordRepository
                .findByDiagnosisIdAndCategory(diagnosisId, FileCategory.BEFORE_IMAGE)
                .stream()
                .map(f -> fileStorage.getPublicUrl(f.getStorageKey()))
                .toList();
    }

    private List<String> resolveAfterImageUris(Long diagnosisId) {
        return fileRecordRepository
                .findByDiagnosisIdAndCategory(diagnosisId, FileCategory.AFTER_IMAGE)
                .stream()
                .map(f -> fileStorage.getPublicUrl(f.getStorageKey()))
                .toList();
    }

    private DecisionService.Estimate buildEstimateFromRisk(int riskScore) {
        if (riskScore >= 70) return new DecisionService.Estimate("HIGH", 70000, 150000);
        if (riskScore >= 40) return new DecisionService.Estimate("MEDIUM", 30000, 70000);
        return new DecisionService.Estimate("LOW", 10000, 30000);
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) return first;
        if (second != null && !second.isBlank()) return second;
        return null;
    }

    private Integer firstNonNull(Integer first, Integer second) {
        return first != null ? first : second;
    }
}
