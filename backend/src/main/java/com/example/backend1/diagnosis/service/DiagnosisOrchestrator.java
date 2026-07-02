package com.example.backend1.diagnosis.service;

import com.example.backend1.ai.llm.GuideResponse;
import com.example.backend1.ai.llm.OpenAiLlmClient;
import com.example.backend1.ai.yolo.YoloClient;
import com.example.backend1.ai.yolo.YoloResponse;
import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.diagnosis.domain.DiagnosisResult;
import com.example.backend1.diagnosis.dto.DiagnosisFullResponse;
import com.example.backend1.diagnosis.repo.DiagnosisResultRepository;
import com.example.backend1.history.repo.HistoryRepository;
import com.example.backend1.history.service.HistoryEntity;
import com.example.backend1.storage.FileStorage;
import com.example.backend1.storage.StoredFile;
import com.example.backend1.user.domain.User;
import com.example.backend1.user.repo.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * AI 진단 전체 흐름을 오케스트레이션 한다.
 *
 * <pre>
 * 사용자 multipart 업로드
 *   ↓
 * 1. FileStorage 에 이미지 저장 (/storage/uploads/)
 * 2. YoloClient 로 GCP YOLO 서버 호출  (multipart forward)
 * 3. RiskCalculator 로 위험도 계산   (백엔드 자체 로직)
 * 4. OpenAI LLM 호출 (DIY 가이드 + 자재 추천 JSON 생성)
 * 5. DiagnosisResult 엔티티에 영속화
 * 6. DiagnosisFullResponse 로 응답
 * </pre>
 *
 * <p>YOLO 실패는 사용자에게 503 으로 노출(=fail fast).
 * <p>LLM 실패는 fallback 가이드로 graceful degradation — 분석 자체는 완료된 거니까 결과는 보여줘야 함.
 */
@Service
public class DiagnosisOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(DiagnosisOrchestrator.class);

    private final UserRepository userRepository;
    private final FileStorage fileStorage;
    private final YoloClient yoloClient;
    private final RiskCalculator riskCalculator;
    private final OpenAiLlmClient llmClient;
    private final DiagnosisResultRepository resultRepository;
    private final HistoryRepository historyRepository;
    private final ObjectMapper objectMapper;

    public DiagnosisOrchestrator(
            UserRepository userRepository,
            FileStorage fileStorage,
            YoloClient yoloClient,
            RiskCalculator riskCalculator,
            OpenAiLlmClient llmClient,
            DiagnosisResultRepository resultRepository,
            HistoryRepository historyRepository,
            ObjectMapper objectMapper
    ) {
        this.userRepository = userRepository;
        this.fileStorage = fileStorage;
        this.yoloClient = yoloClient;
        this.riskCalculator = riskCalculator;
        this.llmClient = llmClient;
        this.resultRepository = resultRepository;
        this.historyRepository = historyRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * 메인 진단 호출.
     *
     * @param username 인증된 사용자명 (Authentication.getName())
     * @param image    사용자 업로드 이미지
     */
    @Transactional
    public DiagnosisFullResponse diagnose(String username, MultipartFile image) {
        return diagnose(username, image, false);
    }

    @Transactional
    public DiagnosisFullResponse diagnose(String username, MultipartFile image, boolean preferDiy) {
        if (image == null || image.isEmpty()) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "이미지를 업로드해주세요.");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        // 1) 이미지 디스크 저장 (storage/uploads/...)
        StoredFile stored = fileStorage.save(image);
        log.info("[DiagnosisOrchestrator] image stored key={} size={}", stored.key(), stored.sizeBytes());

        // 2) YOLO 호출 (실패 시 503 으로 즉시 노출)
        YoloResponse yolo = yoloClient.detect(image);

        // 3) 위험도 계산
        RiskCalculator.RiskResult risk = riskCalculator.calculate(yolo);
        log.info("[DiagnosisOrchestrator] risk score={} level={} mainDefect={} count={} preferDiy={}",
                risk.score(), risk.level(), risk.mainDefect(), risk.detectionCount(), preferDiy);

        // 4) LLM 호출 — 실패 시 fallback 가이드로 graceful degradation
        GuideResponse guide;
        boolean fallback = false;
        String guideJson;
        try {
            String systemPrompt = PromptBuilder.systemPrompt();
            String userPrompt = PromptBuilder.userPrompt(yolo, risk, user, preferDiy);
            String llmJson = llmClient.chat(systemPrompt, userPrompt);
            guide = objectMapper.readValue(llmJson, GuideResponse.class);
            guideJson = llmJson;
        } catch (ApiException e) {
            log.warn("[DiagnosisOrchestrator] LLM 실패 → fallback 가이드 사용: {}", e.getMessage());
            guide = GuideResponse.fallback(risk.level());
            guideJson = serialize(guide);
            fallback = true;
        } catch (Exception e) {
            log.warn("[DiagnosisOrchestrator] LLM JSON 파싱 실패 → fallback 가이드 사용", e);
            guide = GuideResponse.fallback(risk.level());
            guideJson = serialize(guide);
            fallback = true;
        }

        // 5) DB 영속화
        DiagnosisResult entity = new DiagnosisResult(user);
        entity.attachImage(stored.key(), stored.url());
        entity.applyYolo(serialize(yolo));
        entity.applyRisk(risk.score(), risk.level(),
                risk.mainDefect().name(), risk.mainDefect().issueType());
        entity.applyGuide(guideJson, fallback);

        DiagnosisResult saved = resultRepository.save(entity);

        // 6) 히스토리 생성
        try {
            historyRepository.save(new HistoryEntity(user, saved));
        } catch (Exception e) {
            log.warn("[DiagnosisOrchestrator] 히스토리 저장 실패 (진단 결과는 정상 저장됨): {}", e.getMessage());
        }

        // 7) 응답
        return DiagnosisFullResponse.of(saved, yolo, risk, guide);
    }

    @Transactional(readOnly = true)
    public DiagnosisFullResponse get(String username, Long id) {
        DiagnosisResult e = resultRepository.findByIdAndUserUsername(id, username)
                .orElseThrow(() -> new ApiException(ErrorCode.DIAGNOSIS_NOT_FOUND));
        return DiagnosisFullResponse.fromEntity(e, objectMapper);
    }

    @Transactional(readOnly = true)
    public Page<DiagnosisFullResponse> listMine(String username, Pageable pageable) {
        return resultRepository.findByUserUsernameOrderByCreatedAtDesc(username, pageable)
                .map(e -> DiagnosisFullResponse.fromEntity(e, objectMapper));
    }

    private String serialize(Object o) {
        try {
            return objectMapper.writeValueAsString(o);
        } catch (Exception e) {
            log.warn("[DiagnosisOrchestrator] serialize 실패", e);
            return null;
        }
    }
}
