package com.example.backend1.reservation.controller;

import com.example.backend1.reservation.dto.ReservationResponse;
import com.example.backend1.reservation.domain.Reservation;
import com.example.backend1.reservation.repo.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/reservations")
@RequiredArgsConstructor
public class ReservationAdminController {

    private final ReservationRepository reservationRepo;

    // 🔥 전체 + 회사별 조회 (핵심 수정)
    @GetMapping
    public List<ReservationResponse> getAll(
            @RequestParam(required = false) Long companyId
    ) {

        List<Reservation> list;

        if (companyId != null) {
            list = reservationRepo.findByCompanyId(companyId);
        } else {
            list = reservationRepo.findAll();
        }

        return list.stream()
                .map(r -> new ReservationResponse(
                        r.getId(),
                        r.getCustomerName(),
                        r.getIssueSummary(),
                        r.getVisitDate().toString(),
                        r.getStatus().name()
                ))
                .toList();
    }

    // 상태 변경
    @PatchMapping("/{id}")
    public void updateStatus(
            @PathVariable Long id,
            @RequestParam String status
    ) {

        Reservation r = reservationRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("예약 없음"));

        r.setStatus(Reservation.Status.valueOf(status));
        reservationRepo.save(r);
    }
}