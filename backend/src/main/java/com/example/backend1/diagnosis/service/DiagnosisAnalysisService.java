package com.example.backend1.diagnosis.service;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.diagnosis.domain.Diagnosis;
import com.example.backend1.diagnosis.repo.DiagnosisRepository;
import com.example.backend1.history.service.HistoryEntity;
import com.example.backend1.history.repo.HistoryRepository;
import com.example.backend1.user.repo.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DiagnosisAnalysisService {

    private final DiagnosisRepository diagnosisRepository;
    private final HistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final AnalysisJobService analysisJobService;

    public DiagnosisAnalysisService(
            DiagnosisRepository diagnosisRepository,
            HistoryRepository historyRepository,
            UserRepository userRepository,
            AnalysisJobService analysisJobService
    ) {
        this.diagnosisRepository = diagnosisRepository;
        this.historyRepository = historyRepository;
        this.userRepository = userRepository;
        this.analysisJobService = analysisJobService;
    }

    public record StartResult(
            Long historyId,
            String status
    ) {}

    @Transactional
    public StartResult start(String username, List<String> imageKeys) {

        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        // 1. Diagnosis 생성
        Diagnosis diagnosis = diagnosisRepository.save(new Diagnosis(user));

        // 2. History 생성
        HistoryEntity history = historyRepository.save(new HistoryEntity(user, diagnosis));
        diagnosisRepository.flush();
        // 3. 비동기 분석 실행
        analysisJobService.run(
                username,
                diagnosis.getId(),
                history.getId(),
                imageKeys
        );

        return new StartResult(
                history.getId(),
                diagnosis.getStatus().name()
        );
    }
}