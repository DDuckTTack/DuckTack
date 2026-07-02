package com.example.backend1.reservation.repo;

import com.example.backend1.company.domain.Company;
import com.example.backend1.reservation.domain.Reservation;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    // ===== 업체 기준 =====
    List<Reservation> findByCompanyId(Long companyId);

    List<Reservation> findByCompanyIdOrderByVisitDateDescVisitTimeDesc(Long companyId);

    @Query("""
        SELECT r FROM Reservation r
        WHERE r.company.id = :companyId
        AND r.visitDate = :date
    """)
    List<Reservation> findByCompanyAndDate(Long companyId, LocalDate date);

    @Query("""
        SELECT r FROM Reservation r
        WHERE r.company.id = :companyId
        AND r.visitDate BETWEEN :start AND :end
    """)
    List<Reservation> findByCompanyAndMonth(
            Long companyId,
            LocalDate start,
            LocalDate end
    );

    /**
     * 기존 전체 상태 기준 중복 검사.
     * 다른 코드에서 쓰고 있을 수 있어 유지한다.
     */
    boolean existsByCompanyAndVisitDateAndVisitTimeBetween(
            Company company,
            LocalDate date,
            LocalTime start,
            LocalTime end
    );

    /**
     * 예약 신청 중복 차단용.
     * 완료/거절/취소/노쇼 예약은 새 예약을 막으면 안 되므로
     * PENDING, ACCEPTED 같은 진행 중 상태만 대상으로 검사한다.
     */
    boolean existsByCompanyAndVisitDateAndVisitTimeBetweenAndStatusIn(
            Company company,
            LocalDate date,
            LocalTime start,
            LocalTime end,
            List<Reservation.Status> statuses
    );

    // ===== 유저 기준 =====

    /**
     * 홈화면 최신 예약 조회용.
     * company, user를 같이 가져와서 Lazy 로딩 500을 피한다.
     */
    @EntityGraph(attributePaths = {"company", "user"})
    Optional<Reservation> findTopByUserUsernameOrderByIdDesc(String username);

    List<Reservation> findByUserUsernameOrderByIdDesc(String username);

    List<Reservation> findByUserIdOrderByVisitDateDescVisitTimeDesc(Long userId);

    List<Reservation> findTop10ByUserIdOrderByVisitDateDescVisitTimeDesc(Long userId);

    long countByUserId(Long userId);

    long countByUserIdAndStatus(Long userId, Reservation.Status status);

    List<Reservation> findByUserIdAndVisitDateBetween(
            Long userId,
            LocalDate start,
            LocalDate end
    );
}
