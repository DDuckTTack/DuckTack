package com.example.backend1.report.repo;

import com.example.backend1.report.entity.ReportDraft;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
public interface ReportDraftRepository extends JpaRepository<ReportDraft, Long> {

    Optional<ReportDraft> findByDiagnosis_Id(Long diagnosisId);

    Optional<ReportDraft> findByDiagnosisResult_Id(Long diagnosisResultId);

    boolean existsByDiagnosis_Id(Long diagnosisId);

    // 삭제용 메서드 제거
}