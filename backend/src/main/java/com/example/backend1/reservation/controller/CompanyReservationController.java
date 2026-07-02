package com.example.backend1.reservation.controller;

import com.example.backend1.reservation.domain.Reservation;
import com.example.backend1.reservation.dto.*;
import com.example.backend1.reservation.service.ReservationService;
import com.example.backend1.user.domain.User;
import com.example.backend1.user.repo.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/company/reservations")
@RequiredArgsConstructor
public class CompanyReservationController {

    private final ReservationService reservationService;
    private final UserRepository userRepo;

    @GetMapping
    public List<ReservationResponse> getByDate(
            Authentication auth,
            @RequestParam String date
    ) {
        User user = userRepo.findWithCompanyByUsername(auth.getName())
                .orElseThrow();

        Long companyId = user.getCompany().getId();

        List<Reservation> list =
                reservationService.getReservationsByDate(companyId, LocalDate.parse(date));

        return list.stream()
                .map(r -> new ReservationResponse(
                        r.getId(),
                        r.getCustomerName(),
                        r.getIssueSummary(),
                        r.getVisitDate() != null ? r.getVisitDate().toString() : null,
                        r.getVisitTime() != null ? r.getVisitTime().toString() : null,
                        r.getStatus() != null ? r.getStatus().name() : null,
                        null,
                        r.getRepairCompletedDate(),
                        r.getRepairTotalCost(),
                        r.getRepairSummary(),
                        reservationService.getDiagnosisImageUrl(r.getId())
                ))
                .toList();
    }

    @GetMapping("/{id}")
    public ReservationDetailResponse getDetail(
            @PathVariable Long id,
            Authentication auth
    ) {
        User user = userRepo.findWithCompanyByUsername(auth.getName())
                .orElseThrow();

        Long companyId = user.getCompany().getId();

        return reservationService.getDetail(id, companyId);
    }

    @PostMapping("/{id}/status")
    public void updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            Authentication auth
    ) {
        User user = userRepo.findWithCompanyByUsername(auth.getName())
                .orElseThrow();

        Long companyId = user.getCompany().getId();

        reservationService.updateStatus(id, status, companyId);
    }

    @PostMapping("/{id}/accept")
    public void accept(
            @PathVariable Long id,
            Authentication auth
    ) {
        User user = userRepo.findWithCompanyByUsername(auth.getName())
                .orElseThrow();

        Long companyId = user.getCompany().getId();

        reservationService.updateStatus(id, Reservation.Status.ACCEPTED.name(), companyId);
    }

    @PostMapping("/{id}/reject")
    public void reject(
            @PathVariable Long id,
            @RequestBody RejectReservationRequest request,
            Authentication auth
    ) {
        User user = userRepo.findWithCompanyByUsername(auth.getName())
                .orElseThrow();

        Long companyId = user.getCompany().getId();

        reservationService.rejectReservation(id, companyId, request.reason());
    }

    /**
     * 업체 수리 완료 처리.
     * 완료 상태로 바꾸기 전에 수리완료일, 총비용, 실제 작업요약을 반드시 저장한다.
     */
    @PostMapping("/{id}/complete")
    public void complete(
            @PathVariable Long id,
            @RequestBody CompleteReservationRequest request,
            Authentication auth
    ) {
        User user = userRepo.findWithCompanyByUsername(auth.getName())
                .orElseThrow();

        Long companyId = user.getCompany().getId();

        reservationService.completeReservation(id, companyId, request);
    }

    @PostMapping("/{id}/noshow")
    public void noshow(
            @PathVariable Long id,
            Authentication auth
    ) {
        User user = userRepo.findWithCompanyByUsername(auth.getName())
                .orElseThrow();

        Long companyId = user.getCompany().getId();

        reservationService.markNoShow(id, companyId);
    }

    @GetMapping("/month")
    public List<ReservationCalendarResponse> getMonthly(
            Authentication auth,
            @RequestParam int year,
            @RequestParam int month
    ) {
        User user = userRepo.findWithCompanyByUsername(auth.getName())
                .orElseThrow();

        Long companyId = user.getCompany().getId();

        return reservationService.getMonthlyReservations(companyId, year, month);
    }

    public record RejectReservationRequest(
            String reason
    ) {}
}
