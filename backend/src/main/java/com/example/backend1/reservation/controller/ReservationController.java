package com.example.backend1.reservation.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.reservation.dto.ReservationRequest;
import com.example.backend1.reservation.service.ReservationService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    private final ReservationService service;

    public ReservationController(ReservationService service) {
        this.service = service;
    }

    @PostMapping
    public ApiResponse<String> create(
            @RequestBody ReservationRequest req,
            Authentication auth
    ) {
        service.create(req, auth);
        return ApiResponse.ok("예약 완료");
    }
}
