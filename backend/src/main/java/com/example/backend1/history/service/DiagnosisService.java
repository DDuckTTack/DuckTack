package com.example.backend1.diagnosis.service;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.diagnosis.domain.AnalysisStatus;
import com.example.backend1.diagnosis.domain.Diagnosis;
import com.example.backend1.diagnosis.domain.IssueType;
import com.example.backend1.diagnosis.repo.DiagnosisRepository;
import com.example.backend1.history.repo.HistoryRepository;
import com.example.backend1.history.service.HistoryEntity;
import com.example.backend1.user.repo.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Random;

@Service
public class DiagnosisService {

    private final DiagnosisRepository diagnosisRepository;
    private final HistoryRepository historyRepository;
    private final UserRepository userRepository;

    public DiagnosisService(
            DiagnosisRepository diagnosisRepository,
            HistoryRepository historyRepository,
            UserRepository userRepository
    ) {
        this.diagnosisRepository = diagnosisRepository;
        this.historyRepository = historyRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Long createMockDiagnosis(String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        Random r = new Random();

        Diagnosis diagnosis = new Diagnosis(user);
        diagnosis.updateFromAiResult(
                AnalysisStatus.COMPLETED,
                20 + r.nextInt(71),
                IssueType.values()[r.nextInt(IssueType.values().length)]
        );

        diagnosisRepository.save(diagnosis);

        HistoryEntity history = new HistoryEntity(user, diagnosis);
        historyRepository.save(history);

        return diagnosis.getId();
    }
}