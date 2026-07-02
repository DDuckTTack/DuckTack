package com.example.backend1.company.unavailable.dto;

import java.time.LocalDate;

public class CompanyUnavailableTimeDtos {

    public record CreateRequest(
            LocalDate date,
            String time
    ) {}

    public record Response(
            Long id,
            LocalDate date,
            String time
    ) {}

    public record AllResponse(
            String date,
            String time
    ) {}
}