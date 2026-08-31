package com.example.backend1.diagnosis.service;

import com.example.backend1.ai.llm.GuideResponse;
import com.example.backend1.ai.llm.LlmVisionDetector;
import com.example.backend1.ai.llm.OpenAiLlmClient;
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
 * 2. LlmVisionDetector 로 하자 탐지 (LLM 비전 호출)
 * 3. RiskCalculator 로 위험도 계산   (백엔드 자체 로직)
 * 4. OpenAI LLM 호출 (DIY 가이드 JSON 생성)
 * 5. DiagnosisResult 엔티티에 영속화
 * 6. DiagnosisFullResponse 로 응답
 * </pre>
 *
 * <p>탐지 실패는 사용자에게 노출(=fail fast). 탐지가 안 되면 진단 자체가 성립하지 않기 때문.
 * <p>가이드 생성 실패는 fallback 가이드로 graceful degradation — 탐지는 됐으니 결과는 보여줘야 함.
 *
 * <p>과거에는 2번을 자체 학습 YOLO + SAM 서버(ai-server)가 담당했으나, 학습 데이터 부족으로
 * LLM 비전 모델로 전환했다. 탐지 결과 스키마({@link YoloResponse})는 그대로 유지된다.
 */
@Service
public class DiagnosisOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(DiagnosisOrchestrator.class);

    private final UserRepository userRepository;
    private final FileStorage fileStorage;
    private final LlmVisionDetector visionDetector;
    private final RiskCalculator riskCalculator;
    private final OpenAiLlmClient llmClient;
    private final DiagnosisResultRepository resultRepository;
    private final HistoryRepository historyRepository;
    private final ObjectMapper objectMapper;

    public DiagnosisOrchestrator(
            UserRepository userRepository,
            FileStorage fileStorage,
            LlmVisionDetector visionDetector,
            RiskCalculator riskCalculator,
            OpenAiLlmClient llmClient,
            DiagnosisResultRepository resultRepository,
            HistoryRepository historyRepository,
            ObjectMapper objectMapper
    ) {
        this.userRepository = userRepository;
        this.fileStorage = fileStorage;
        this.visionDetector = visionDetector;
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
        return diagnose(username, java.util.List.of(image), false);
    }

    @Transactional
    public DiagnosisFullResponse diagnose(String username, MultipartFile image, boolean preferDiy) {
        return diagnose(username, java.util.List.of(image), preferDiy);
    }

    /**
     * 여러 장을 함께 진단한다.
     *
     * <p>사용자가 같은 하자를 여러 각도에서 찍어 올릴 수 있으므로 전부 LLM 에 넘겨
     * 한 번에 종합 판단시킨다. 저장/응답의 대표 이미지는 첫 번째 장을 쓴다.
     */
    @Transactional
    public DiagnosisFullResponse diagnose(String username, java.util.List<MultipartFile> images, boolean preferDiy) {
        java.util.List<MultipartFile> validImages = images == null
                ? java.util.List.<MultipartFile>of()
                : images.stream().filter(f -> f != null && !f.isEmpty()).toList();

        if (validImages.isEmpty()) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "이미지를 업로드해주세요.");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        // 1) 이미지 디스크 저장 (storage/uploads/...) — 대표 이미지는 첫 장
        StoredFile stored = fileStorage.save(validImages.get(0));
        for (int i = 1; i < validImages.size(); i++) {
            try {
                fileStorage.save(validImages.get(i));
            } catch (Exception e) {
                log.warn("[DiagnosisOrchestrator] 추가 이미지 저장 실패 (분석에는 영향 없음)", e);
            }
        }
        log.info("[DiagnosisOrchestrator] images={} stored key={} size={}",
                validImages.size(), stored.key(), stored.sizeBytes());

        // 2) LLM 비전으로 하자 탐지 — 올린 사진 전부를 한 번에 분석 (실패 시 즉시 노출)
        YoloResponse yolo = visionDetector.detect(validImages);

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
