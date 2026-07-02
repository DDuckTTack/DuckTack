package com.example.backend1.reservation.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.reservation.domain.Reservation;
import com.example.backend1.reservation.repo.ReservationRepository;
import com.example.backend1.reservation.service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class UserReservationController {

    private final ReservationService reservationService;
    private final ReservationRepository reservationRepository;

    @PatchMapping("/{id}/cancel")
    public void cancel(@PathVariable Long id, Authentication auth) {
        reservationService.cancelReservation(id, auth);
    }

    @GetMapping("/my/latest")
    @Transactional(readOnly = true)
    public ApiResponse<LatestReservationResponse> getMyLatestReservation(Authentication auth) {
        String username = auth.getName();

        return reservationRepository.findTopByUserUsernameOrderByIdDesc(username)
                .map(r -> ApiResponse.ok(LatestReservationResponse.from(r)))
                .orElseGet(() -> ApiResponse.ok(null));
    }

    public record LatestReservationResponse(
            Long reservationId,
            Long companyId,
            String companyName,
            Reservation.Status status,
            LocalDate visitDate,
            LocalTime visitTime,
            String issueSummary,
            String requestNote,
            String rejectReason,
            String displayTitle,
            String displaySubtitle,
            int stepIndex
    ) {
        public static LatestReservationResponse from(Reservation r) {
            Reservation.Status status = r.getStatus();

            String title;
            String subtitle;
            int step;

            if (status == Reservation.Status.PENDING) {
                title = "예약 신청 완료";
                subtitle = "전문가 수락 대기중입니다.";
                step = 1;
            } else if (status == Reservation.Status.ACCEPTED) {
                title = "전문가 수락 완료";
                subtitle = "방문 대기중입니다.";
                step = 2;
            } else if (status == Reservation.Status.DONE) {
                title = "해결 완료";
                subtitle = "서비스가 완료되었습니다.";
                step = 3;
            } else if (status == Reservation.Status.REJECTED) {
                title = "예약 거절";
                subtitle = r.getRejectReason() != null && !r.getRejectReason().isBlank()
                        ? r.getRejectReason()
                        : "업체가 예약을 거절했습니다.";
                step = 0;
            } else if (status == Reservation.Status.CANCELLED) {
                title = "예약 취소";
                subtitle = "예약이 취소되었습니다.";
                step = 0;
            } else if (status == Reservation.Status.NOSHOW) {
                title = "방문 불발";
                subtitle = "방문이 완료되지 않았습니다.";
                step = 0;
            } else {
                title = "예약 상태 확인";
                subtitle = "예약 상태를 확인해주세요.";
                step = 0;
            }

            Long companyId = null;
            String companyName = null;

            if (r.getCompany() != null) {
                companyId = r.getCompany().getId();
                companyName = r.getCompany().getName();
            }

            return new LatestReservationResponse(
                    r.getId(),
                    companyId,
                    companyName,
                    status,
                    r.getVisitDate(),
                    r.getVisitTime(),
                    r.getIssueSummary(),
                    r.getRequestNote(),
                    r.getRejectReason(),
                    title,
                    subtitle,
                    step
            );
        }
    }
}