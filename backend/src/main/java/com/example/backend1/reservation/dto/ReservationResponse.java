package com.example.backend1.reservation.dto;

import java.time.LocalDate;

public record ReservationResponse(
        Long id,
        String customerName,
        String issueSummary,
        String visitDate,
        String visitTime,
        String status,
        String customerEmail,
        LocalDate repairCompletedDate,
        Integer repairTotalCost,
        String repairSummary,
        String imageUrl
) {
    public ReservationResponse(
            Long id,
            String customerName,
            String issueSummary,
            String visitDate,
            String visitTime,
            String status,
            String customerEmail
    ) {
        this(id, customerName, issueSummary, visitDate, visitTime, status, customerEmail, null, null, null, null);
    }

    public ReservationResponse(
            Long id,
            String customerName,
            String issueSummary,
            String visitDate,
            String status
    ) {
        this(id, customerName, issueSummary, visitDate, null, status, null, null, null, null, null);
    }
}
