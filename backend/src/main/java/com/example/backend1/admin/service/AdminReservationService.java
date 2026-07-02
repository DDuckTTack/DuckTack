package com.example.backend1.admin.service;

import com.example.backend1.reservation.domain.Reservation;
import com.example.backend1.reservation.dto.ReservationResponse;
import com.example.backend1.reservation.repo.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminReservationService {

    private final ReservationRepository reservationRepo;
    // 전체 조회
    public List<ReservationResponse> getAll() {
        return reservationRepo.findAll()
                .stream()
                .map(this::toDto)
                .toList();
    }

    // 회사별 조회
    public List<ReservationResponse> getByCompany(Long companyId) {
        return reservationRepo.findByCompanyId(companyId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    private ReservationResponse toDto(Reservation r) {
        return new ReservationResponse(
                r.getId(),
                r.getCustomerName(),
                r.getIssueSummary(),
                r.getVisitDate().toString(),
                r.getStatus().name()
        );
    }
}