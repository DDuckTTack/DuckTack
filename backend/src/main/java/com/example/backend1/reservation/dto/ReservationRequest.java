package com.example.backend1.reservation.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record ReservationRequest(
        Long vendorId,
        Long historyId,
        String customerName,
        String phoneNumber,
        String address,
        LocalDate visitDate,
        LocalTime visitTime,
        String issueSummary,
        String requestNote
) {}