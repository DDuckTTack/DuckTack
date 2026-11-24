package com.example.backend1.user.service;

import com.example.backend1.bidding.domain.BidRequest;
import com.example.backend1.bidding.repo.BidRequestRepository;
import com.example.backend1.diagnosis.domain.Diagnosis;
import com.example.backend1.diagnosis.domain.DiagnosisResult;
import com.example.backend1.diagnosis.repo.DiagnosisRepository;
import com.example.backend1.diagnosis.repo.DiagnosisResultRepository;
import com.example.backend1.history.repo.HistoryRepository;
import com.example.backend1.history.service.HistoryEntity;
import com.example.backend1.report.repo.ReportDraftRepository;
import com.example.backend1.reservation.domain.Reservation;
import com.example.backend1.reservation.repo.ReservationRepository;
import com.example.backend1.review.repo.ReviewRepository;
import com.example.backend1.storage.FileRecord;
import com.example.backend1.storage.FileRecordRepository;
import com.example.backend1.storage.FileStorage;
import com.example.backend1.user.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 회원 탈퇴 시 사용자 데이터 파기.
 *
 * <ul>
 *   <li>진단 기록(진단·분석 결과·리포트·초안)과 업로드 사진·PDF 파일은 삭제한다.</li>
 *   <li>단, 업체와의 거래(예약·입찰·리뷰)에 연결된 진단 기록은 업체 쪽 기록 보존을 위해 행을 남기고,
 *       사진·PDF 파일만 삭제한다.</li>
 *   <li>예약·입찰에 남은 이름·연락처·주소는 익명 처리한다.</li>
 * </ul>
 * 파일은 DB 트랜잭션이 커밋된 뒤에 지워, 롤백 시 파일만 사라지는 일이 없게 한다.
 */
@Service
public class AccountWithdrawalService {

    private static final Logger log = LoggerFactory.getLogger(AccountWithdrawalService.class);

    private final HistoryRepository historyRepository;
    private final DiagnosisRepository diagnosisRepository;
    private final DiagnosisResultRepository diagnosisResultRepository;
    private final ReportDraftRepository reportDraftRepository;
    private final FileRecordRepository fileRecordRepository;
    private final BidRequestRepository bidRequestRepository;
    private final ReviewRepository reviewRepository;
    private final ReservationRepository reservationRepository;
    private final FileStorage fileStorage;

    public AccountWithdrawalService(
            HistoryRepository historyRepository,
            DiagnosisRepository diagnosisRepository,
            DiagnosisResultRepository diagnosisResultRepository,
            ReportDraftRepository reportDraftRepository,
            FileRecordRepository fileRecordRepository,
            BidRequestRepository bidRequestRepository,
            ReviewRepository reviewRepository,
            ReservationRepository reservationRepository,
            FileStorage fileStorage
    ) {
        this.historyRepository = historyRepository;
        this.diagnosisRepository = diagnosisRepository;
        this.diagnosisResultRepository = diagnosisResultRepository;
        this.reportDraftRepository = reportDraftRepository;
        this.fileRecordRepository = fileRecordRepository;
        this.bidRequestRepository = bidRequestRepository;
        this.reviewRepository = reviewRepository;
        this.reservationRepository = reservationRepository;
        this.fileStorage = fileStorage;
    }

    @Transactional
    public void purgeUserData(User user) {
        Long userId = user.getId();
        List<String> fileKeys = new ArrayList<>();

        // 1. 히스토리: 업체 거래에 연결된 것만 남기고 삭제
        Set<Long> keptDiagnosisIds = new HashSet<>();
        Set<Long> keptResultIds = new HashSet<>();
        int deletedHistories = 0;
        for (HistoryEntity history : historyRepository.findByUserId(userId)) {
            boolean linkedToCompany = history.getReservation() != null
                    || bidRequestRepository.existsByHistoryId(history.getId())
                    || reviewRepository.existsByHistoryId(history.getId());
            if (linkedToCompany) {
                if (history.getDiagnosis() != null) keptDiagnosisIds.add(history.getDiagnosis().getId());
                if (history.getDiagnosisResult() != null) keptResultIds.add(history.getDiagnosisResult().getId());
            } else {
                historyRepository.delete(history);
                deletedHistories++;
            }
        }
        historyRepository.flush();

        // 2. 구 파이프라인 진단 (리포트 메타데이터는 cascade 로 함께 삭제)
        for (Diagnosis diagnosis : diagnosisRepository.findByUserId(userId)) {
            if (diagnosis.getReport() != null) fileKeys.add(diagnosis.getReport().getStorageKey());
            if (keptDiagnosisIds.contains(diagnosis.getId())) {
                diagnosis.attachReport(null);
                continue;
            }
            reportDraftRepository.findByDiagnosis_Id(diagnosis.getId()).ifPresent(reportDraftRepository::delete);
            diagnosisRepository.delete(diagnosis);
        }

        // 3. 신 파이프라인 분석 결과
        for (DiagnosisResult result : diagnosisResultRepository.findByUserId(userId)) {
            fileKeys.add(result.getImageKey());
            fileKeys.add(result.getPdfStorageKey());
            if (keptResultIds.contains(result.getId())) {
                result.attachPdf(null, null);
                continue;
            }
            reportDraftRepository.findByDiagnosisResult_Id(result.getId()).ifPresent(reportDraftRepository::delete);
            diagnosisResultRepository.delete(result);
        }

        // 4. 업로드 파일 기록 (진단 사진·리포트 PDF 등)
        List<FileRecord> fileRecords = fileRecordRepository.findByUserId(userId);
        for (FileRecord record : fileRecords) {
            fileKeys.add(record.getStorageKey());
        }
        fileRecordRepository.deleteAll(fileRecords);

        // 5. 업체 거래 기록의 개인정보 익명화
        for (Reservation reservation : reservationRepository.findByUserIdOrderByVisitDateDescVisitTimeDesc(userId)) {
            reservation.anonymizeCustomer();
        }
        for (BidRequest bidRequest : bidRequestRepository.findByUserId(userId)) {
            bidRequest.anonymizeRequester();
        }

        deleteFilesAfterCommit(fileKeys);
        log.info("Withdrawal purge: userId={} historiesDeleted={} keptForCompany={} files={}",
                userId, deletedHistories, keptDiagnosisIds.size() + keptResultIds.size(), fileKeys.size());
    }

    private void deleteFilesAfterCommit(List<String> keys) {
        List<String> targets = keys.stream().filter(k -> k != null && !k.isBlank()).distinct().toList();
        if (targets.isEmpty()) return;

        Runnable task = () -> {
            for (String key : targets) {
                try {
                    fileStorage.delete(key);
                } catch (RuntimeException e) {
                    log.warn("탈퇴 파일 삭제 실패 key={}: {}", key, e.getMessage());
                }
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    task.run();
                }
            });
        } else {
            task.run();
        }
    }
}
