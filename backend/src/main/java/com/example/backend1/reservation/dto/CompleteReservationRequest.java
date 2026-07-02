package com.example.backend1.reservation.dto;

import java.time.LocalDate;

public record CompleteReservationRequest(
        LocalDate repairCompletedDate,
        Integer totalCost,
        String repairSummary
) {}
