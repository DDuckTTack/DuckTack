package com.example.backend1.company.unavailable.dto;

import java.time.LocalDate;

public class CompanyUnavailableDateDtos {

    public record CreateRequest(
            LocalDate unavailableDate
    ) {}

    public record Response(
            Long id,
            LocalDate unavailableDate
    ) {}
}