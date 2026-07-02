package com.example.backend1.reservation.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ReservationCalendarResponse {

    private String date;
    private long pending;
    private long accepted;
    private long rejected;
}