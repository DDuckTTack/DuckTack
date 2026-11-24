package com.example.backend1.user;

import com.example.backend1.bidding.domain.BidRequest;
import com.example.backend1.bidding.repo.BidRequestRepository;
import com.example.backend1.common.ApiException;
import com.example.backend1.diagnosis.domain.Diagnosis;
import com.example.backend1.diagnosis.domain.DiagnosisResult;
import com.example.backend1.diagnosis.repo.DiagnosisRepository;
import com.example.backend1.diagnosis.repo.DiagnosisResultRepository;
import com.example.backend1.history.repo.HistoryRepository;
import com.example.backend1.history.service.HistoryEntity;
import com.example.backend1.reservation.domain.Reservation;
import com.example.backend1.reservation.repo.ReservationRepository;
import com.example.backend1.storage.FileCategory;
import com.example.backend1.storage.FileRecord;
import com.example.backend1.storage.FileRecordRepository;
import com.example.backend1.storage.FileStorage;
import com.example.backend1.storage.StoredFile;
import com.example.backend1.user.domain.RentType;
import com.example.backend1.user.domain.ResidenceType;
import com.example.backend1.user.domain.User;
import com.example.backend1.user.dto.UserDtos;
import com.example.backend1.user.repo.UserRepository;
import com.example.backend1.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 회원 탈퇴 시 진단 기록·파일은 삭제되고, 업체 거래(예약·입찰)에 연결된 기록은
 * 행을 남긴 채 개인정보만 익명화되는지 실제 DB 에서 검증한다.
 * 파일 삭제는 커밋 후에 실행되므로 테스트 자체에는 트랜잭션을 걸지 않는다.
 */
@SpringBootTest
@TestPropertySource(properties = "storage.local.root=build/tmp/withdrawal-test-storage")
class AccountWithdrawalTest {

    private static final String STORAGE_ROOT = "build/tmp/withdrawal-test-storage";

    @Autowired private UserService userService;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private DiagnosisRepository diagnosisRepository;
    @Autowired private DiagnosisResultRepository diagnosisResultRepository;
    @Autowired private HistoryRepository historyRepository;
    @Autowired private ReservationRepository reservationRepository;
    @Autowired private BidRequestRepository bidRequestRepository;
    @Autowired private FileRecordRepository fileRecordRepository;
    @Autowired private FileStorage fileStorage;

    private User newUser(String rawPassword) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return userRepository.save(new User(
                "w_" + suffix, "w_" + suffix + "@example.com", passwordEncoder.encode(rawPassword), "010" + suffix,
                ResidenceType.APT, RentType.MONTHLY, "서울시 중구", true, true, true));
    }

    @Test
    void withdraw_deletesDiagnosisData_andAnonymizesCompanyRecords() {
        User user = newUser("pw1234");
        String username = user.getUsername();

        // 업체와 무관한 진단 (삭제 대상): 구 파이프라인 + 사진 파일
        Diagnosis freeDiagnosis = diagnosisRepository.save(new Diagnosis(user));
        HistoryEntity freeHistory = historyRepository.save(new HistoryEntity(user, freeDiagnosis));
        StoredFile photo = fileStorage.saveBytes("photo.jpg", "image/jpeg", new byte[]{1, 2, 3});
        FileRecord photoRecord = fileRecordRepository.save(
                new FileRecord(user, FileCategory.UPLOAD, photo, freeDiagnosis.getId()));

        // 업체와 무관한 진단 (삭제 대상): 신 파이프라인
        DiagnosisResult freeResult = new DiagnosisResult(user);
        StoredFile resultImage = fileStorage.saveBytes("result.jpg", "image/jpeg", new byte[]{4, 5, 6});
        freeResult.attachImage(resultImage.key(), resultImage.url());
        freeResult = diagnosisResultRepository.save(freeResult);
        HistoryEntity freeResultHistory = historyRepository.save(new HistoryEntity(user, freeResult));

        // 예약에 연결된 진단 (보존 + 익명화 대상)
        Diagnosis reservedDiagnosis = diagnosisRepository.save(new Diagnosis(user));
        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setCustomerName("홍길동");
        reservation.setPhoneNumber("01012345678");
        reservation.setAddress("서울시 중구 세종대로 110");
        reservation.setRequestNote("오후 방문 희망");
        reservation = reservationRepository.save(reservation);
        HistoryEntity reservedHistory = new HistoryEntity(user, reservedDiagnosis);
        reservedHistory.setReservation(reservation);
        reservedHistory = historyRepository.save(reservedHistory);

        // 입찰에 연결된 분석 결과 (보존 + 익명화 대상)
        DiagnosisResult biddedResult = diagnosisResultRepository.save(new DiagnosisResult(user));
        HistoryEntity biddedHistory = historyRepository.save(new HistoryEntity(user, biddedResult));
        BidRequest bidRequest = bidRequestRepository.save(new BidRequest(
                user, biddedHistory, "서울시 강남구 테헤란로 123", 37.5, 127.0,
                null, OffsetDateTime.now().plusHours(1), 10));

        userService.withdraw(username, new UserDtos.WithdrawRequest("pw1234"));

        // 계정: 익명화 + 로그인 불가
        User withdrawn = userRepository.findById(user.getId()).orElseThrow();
        assertThat(userRepository.findByUsername(username)).isEmpty();
        assertThat(withdrawn.getUsername()).startsWith("탈퇴회원_");
        assertThat(withdrawn.getEmail()).isNull();
        assertThat(withdrawn.getPhoneNumber()).isEqualTo("withdrawn-" + user.getId());
        assertThat(passwordEncoder.matches("pw1234", withdrawn.getPasswordHash())).isFalse();

        // 업체와 무관한 진단 기록·파일: 삭제
        assertThat(historyRepository.findById(freeHistory.getId())).isEmpty();
        assertThat(historyRepository.findById(freeResultHistory.getId())).isEmpty();
        assertThat(diagnosisRepository.findById(freeDiagnosis.getId())).isEmpty();
        assertThat(diagnosisResultRepository.findById(freeResult.getId())).isEmpty();
        assertThat(fileRecordRepository.findById(photoRecord.getId())).isEmpty();
        assertThat(Files.exists(Paths.get(STORAGE_ROOT, photo.key()))).isFalse();
        assertThat(Files.exists(Paths.get(STORAGE_ROOT, resultImage.key()))).isFalse();

        // 업체 거래 기록: 행 유지 + 개인정보 익명화
        assertThat(historyRepository.findById(reservedHistory.getId())).isPresent();
        assertThat(historyRepository.findById(biddedHistory.getId())).isPresent();
        assertThat(diagnosisRepository.findById(reservedDiagnosis.getId())).isPresent();
        assertThat(diagnosisResultRepository.findById(biddedResult.getId())).isPresent();

        Reservation anonymizedReservation = reservationRepository.findById(reservation.getId()).orElseThrow();
        assertThat(anonymizedReservation.getCustomerName()).isEqualTo("탈퇴한 회원");
        assertThat(anonymizedReservation.getPhoneNumber()).isNull();
        assertThat(anonymizedReservation.getAddress()).isNull();
        assertThat(anonymizedReservation.getRequestNote()).isNull();

        BidRequest anonymizedBid = bidRequestRepository.findById(bidRequest.getId()).orElseThrow();
        assertThat(anonymizedBid.getAddress()).isEqualTo("(탈퇴한 회원)");
    }

    @Test
    void withdraw_rejectsWrongPassword_andKeepsAccount() {
        User user = newUser("pw1234");

        assertThatThrownBy(() -> userService.withdraw(user.getUsername(), new UserDtos.WithdrawRequest("wrong")))
                .isInstanceOf(ApiException.class);

        assertThat(userRepository.findByUsername(user.getUsername())).isPresent();
    }
}
