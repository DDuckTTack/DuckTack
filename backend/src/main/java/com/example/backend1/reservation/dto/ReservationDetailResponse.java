package com.example.backend1.reservation.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Builder
public class ReservationDetailResponse {

    private Long id;
    private String status;

    private String customerName;
    private String phoneNumber;
    private String customerEmail;
    private String address;

    private String issueSummary;
    private String requestNote;

    private LocalDate visitDate;
    private LocalTime visitTime;

    private LocalDate repairCompletedDate;
    private Integer repairTotalCost;
    private String repairSummary;

    private String imageUrl;
}
